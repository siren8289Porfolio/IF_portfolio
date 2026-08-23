"""
External public data ingestion for IF DE.

Pipeline:
  extract -> raw immutable snapshot -> schema check -> normalize -> deduplicate
  -> DQ gate -> serving parquet -> lineage/manifest

Public datasets are Reference/Context only. This script writes under
ai/data/external and does not touch Applicant/Assessment runtime tables.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import time
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_EXTERNAL_DIR = PROJECT_ROOT / "data" / "external"
CATALOG_PATH = Path(__file__).with_name("external_sources.json")


@dataclass(frozen=True)
class SourceConfig:
  key: str
  source_name: str
  source_url: str
  source_type: str
  target: str
  schema_version: str
  required_fields: list[str]
  field_map: dict[str, list[str]]


def utc_now() -> str:
  return datetime.now(timezone.utc).isoformat()


def stable_json(value: Any) -> str:
  return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha256_text(value: str) -> str:
  return hashlib.sha256(value.encode("utf-8")).hexdigest()


def load_catalog(path: Path = CATALOG_PATH) -> dict[str, SourceConfig]:
  raw = json.loads(path.read_text(encoding="utf-8"))
  return {
    key: SourceConfig(
      key=key,
      source_name=value["source_name"],
      source_url=value["source_url"],
      source_type=value["source_type"],
      target=value["target"],
      schema_version=value["schema_version"],
      required_fields=value.get("required_fields", []),
      field_map=value.get("field_map", {}),
    )
    for key, value in raw.items()
  }


def external_dir() -> Path:
  return Path(os.environ.get("IF_EXTERNAL_DATA_DIR", DEFAULT_EXTERNAL_DIR))


def ensure_dirs(base_dir: Path) -> None:
  for name in ("raw", "validated", "serving", "manifests", "lineage"):
    (base_dir / name).mkdir(parents=True, exist_ok=True)


def read_input_file(path: Path) -> bytes:
  return path.read_bytes()


def fetch_url(url: str, retries: int = 3, timeout: int = 30) -> bytes:
  last_error: Exception | None = None
  for attempt in range(retries):
    try:
      request = urllib.request.Request(url, headers={"User-Agent": "IF-DE/1.0"})
      with urllib.request.urlopen(request, timeout=timeout) as response:
        return response.read()
    except (urllib.error.URLError, TimeoutError) as exc:
      last_error = exc
      if attempt < retries - 1:
        time.sleep(2 ** attempt)
  raise RuntimeError(f"fetch failed after {retries} attempts: {last_error}")


def parse_payload(payload: bytes, source_type: str, input_name: str | None = None) -> list[dict[str, Any]]:
  name = (input_name or "").lower()
  text = payload.decode("utf-8-sig", errors="replace")

  if source_type in {"OPENAPI_XML"} or name.endswith(".xml"):
    return parse_xml_items(text)
  if source_type in {"OPENAPI_JSON", "KOSIS"} or name.endswith(".json"):
    parsed = json.loads(text)
    if isinstance(parsed, list):
      return [dict(item) for item in parsed if isinstance(item, dict)]
    if isinstance(parsed, dict):
      rows = parsed.get("data") or parsed.get("items") or parsed.get("item")
      if isinstance(rows, list):
        return [dict(item) for item in rows if isinstance(item, dict)]
      return [parsed]
  if source_type.startswith("FILE_") or name.endswith(".csv"):
    return list(csv.DictReader(text.splitlines()))

  raise ValueError(f"unsupported source type/input: {source_type} {input_name or ''}")


def parse_xml_items(text: str) -> list[dict[str, Any]]:
  root = ET.fromstring(text)
  candidates = root.findall(".//item")
  if not candidates:
    candidates = root.findall(".//row")
  if not candidates:
    candidates = [child for child in root if len(child)]
  rows: list[dict[str, Any]] = []
  for item in candidates:
    row: dict[str, Any] = {}
    for child in list(item):
      tag = child.tag.split("}", 1)[-1]
      row[tag] = (child.text or "").strip()
    if row:
      rows.append(row)
  return rows


def pick(row: dict[str, Any], candidates: list[str]) -> Any:
  for key in candidates:
    if key in row and row[key] not in (None, ""):
      return row[key]
  return None


def normalize_value(field: str, value: Any) -> Any:
  if value in ("", None):
    return None
  if field in {"recruitment_count", "business_year", "injured_count", "death_count"}:
    try:
      return int(str(value).replace(",", "").strip())
    except ValueError:
      return None
  if field in {"metric_value", "budget_amount", "accident_rate", "accident_risk_score"}:
    try:
      return float(str(value).replace(",", "").strip())
    except ValueError:
      return None
  if field in {"posting_start_date", "posting_end_date"}:
    raw = str(value).strip().replace(".", "").replace("-", "")
    if len(raw) == 8 and raw.isdigit():
      return f"{raw[0:4]}-{raw[4:6]}-{raw[6:8]}"
  return str(value).strip()


def normalize_rows(rows: list[dict[str, Any]], config: SourceConfig, collected_at: str) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
  accepted: list[dict[str, Any]] = []
  rejected: list[dict[str, Any]] = []
  seen: set[str] = set()

  for index, row in enumerate(rows):
    normalized: dict[str, Any] = {}
    for target_field, candidates in config.field_map.items():
      normalized[target_field] = normalize_value(target_field, pick(row, candidates))

    if not normalized.get("source_key"):
      normalized["source_key"] = sha256_text(stable_json(row))

    missing = [field for field in config.required_fields if not normalized.get(field)]
    if missing:
      rejected.append({"row_index": index, "reason": f"missing required fields: {','.join(missing)}", "payload": row})
      continue

    natural_key = f"{config.source_name}:{normalized['source_key']}"
    if natural_key in seen:
      rejected.append({"row_index": index, "reason": "duplicate source natural key in batch", "payload": row})
      continue
    seen.add(natural_key)

    normalized.update(
      {
        "source_name": config.source_name,
        "source_url": config.source_url,
        "source_updated_at": None,
        "collected_at": collected_at,
        "schema_version": config.schema_version,
        "checksum": sha256_text(stable_json(row)),
      }
    )
    accepted.append(normalized)

  return accepted, rejected


def write_jsonl(path: Path, rows: list[dict[str, Any]]) -> None:
  with path.open("w", encoding="utf-8") as handle:
    for row in rows:
      handle.write(stable_json(row) + "\n")


def build_dq_results(raw_count: int, accepted: list[dict[str, Any]], rejected: list[dict[str, Any]], config: SourceConfig) -> list[dict[str, str]]:
  results: list[dict[str, str]] = []

  def add(check_name: str, passed: bool, actual: str, expected: str = "pass", message: str = "") -> None:
    results.append(
      {
        "check_name": check_name,
        "status": "PASS" if passed else "FAIL",
        "expected_value": expected,
        "actual_value": actual,
        "message": message,
      }
    )

  add(
    "row_count_reconciliation",
    raw_count == len(accepted) + len(rejected),
    f"raw={raw_count}, accepted={len(accepted)}, rejected={len(rejected)}",
  )
  add("required_identifier_not_null", len(rejected) == 0, f"rejected={len(rejected)}")

  keys = [str(row["source_key"]) for row in accepted]
  add("source_natural_key_duplicate_zero", len(keys) == len(set(keys)), f"accepted={len(keys)}, distinct={len(set(keys))}")

  if config.target == "elderly_employment_snapshot":
    grains = [
      (row.get("reference_period"), row.get("region_code"), row.get("age_group"), row.get("metric"))
      for row in accepted
    ]
    add("kosis_grain_duplicate_zero", len(grains) == len(set(grains)), f"accepted={len(grains)}, distinct={len(set(grains))}")

  return results


def run_ingestion(config: SourceConfig, payload: bytes, idempotency_key: str, input_name: str | None = None) -> dict[str, Any]:
  base_dir = external_dir()
  ensure_dirs(base_dir)
  collected_at = utc_now()
  payload_checksum = hashlib.sha256(payload).hexdigest()
  run_key = sha256_text(f"{config.key}:{config.schema_version}:{idempotency_key}:{payload_checksum}")[:24]

  rows = parse_payload(payload, config.source_type, input_name)
  manifest_path = base_dir / "manifests" / f"{config.key}_{run_key}.json"
  raw_path = base_dir / "raw" / f"{config.key}_{run_key}.jsonl"
  accepted_path = base_dir / "validated" / f"{config.key}_{run_key}_accepted.jsonl"
  rejected_path = base_dir / "validated" / f"{config.key}_{run_key}_rejected.jsonl"
  dq_path = base_dir / "validated" / f"{config.key}_{run_key}_dq.json"
  lineage_path = base_dir / "lineage" / f"{config.key}_{run_key}.json"
  serving_path = base_dir / "serving" / f"{config.target}.parquet"

  accepted, rejected = normalize_rows(rows, config, collected_at)
  dq_results = build_dq_results(len(rows), accepted, rejected, config)
  dq_passed = all(result["status"] == "PASS" for result in dq_results)

  raw_records = [
    {
      "source_name": config.source_name,
      "source_url": config.source_url,
      "source_key": row.get("source_key") or sha256_text(stable_json(row)),
      "source_updated_at": None,
      "collected_at": collected_at,
      "schema_version": config.schema_version,
      "payload": row,
      "checksum": sha256_text(stable_json(row)),
    }
    for row in rows
  ]
  write_jsonl(raw_path, raw_records)
  write_jsonl(accepted_path, accepted)
  write_jsonl(rejected_path, rejected)
  dq_path.write_text(json.dumps(dq_results, ensure_ascii=False, indent=2), encoding="utf-8")

  status = "SUCCESS" if dq_passed else "DQ_FAILED"
  if dq_passed:
    new_df = pd.DataFrame(accepted)
    if serving_path.exists():
      old_df = pd.read_parquet(serving_path)
      combined = pd.concat([old_df, new_df], ignore_index=True)
    else:
      combined = new_df
    if not combined.empty:
      combined = combined.drop_duplicates(subset=["source_name", "source_key"], keep="last")
    combined.to_parquet(serving_path, index=False)

  lineage = {
    "source_name": config.source_name,
    "source_url": config.source_url,
    "idempotency_key": idempotency_key,
    "run_key": run_key,
    "events": [
      {"from_layer": "source", "to_layer": "raw_external_snapshot", "target": str(raw_path), "row_count": len(rows)},
      {"from_layer": "raw_external_snapshot", "to_layer": "validated_normalized", "target": str(accepted_path), "row_count": len(accepted)},
      {"from_layer": "validated_normalized", "to_layer": "serving", "target": str(serving_path), "row_count": len(accepted) if dq_passed else 0},
    ],
  }
  lineage_path.write_text(json.dumps(lineage, ensure_ascii=False, indent=2), encoding="utf-8")

  manifest = {
    "source_key": config.key,
    "source_name": config.source_name,
    "source_url": config.source_url,
    "target": config.target,
    "schema_version": config.schema_version,
    "idempotency_key": idempotency_key,
    "run_key": run_key,
    "payload_checksum": payload_checksum,
    "status": status,
    "started_at": collected_at,
    "finished_at": utc_now(),
    "raw_row_count": len(rows),
    "accepted_row_count": len(accepted),
    "rejected_row_count": len(rejected),
    "raw_path": str(raw_path),
    "accepted_path": str(accepted_path),
    "rejected_path": str(rejected_path),
    "dq_path": str(dq_path),
    "lineage_path": str(lineage_path),
    "serving_path": str(serving_path) if dq_passed else None,
  }
  manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
  return manifest


def main() -> None:
  parser = argparse.ArgumentParser(description="Ingest IF external public Reference/Context data")
  parser.add_argument("--source", required=True, help="source key from external_sources.json")
  parser.add_argument("--input-file", help="local XML/JSON/CSV file to ingest")
  parser.add_argument("--url", help="direct API/file URL. Use a concrete endpoint URL, not the data.go.kr catalog page.")
  parser.add_argument("--idempotency-key", required=True, help="collection window key, e.g. 2026-08 or 2026-08-23T00")
  args = parser.parse_args()

  catalog = load_catalog()
  if args.source not in catalog:
    raise SystemExit(f"unknown source: {args.source}. available={', '.join(sorted(catalog))}")
  if bool(args.input_file) == bool(args.url):
    raise SystemExit("provide exactly one of --input-file or --url")

  payload = read_input_file(Path(args.input_file)) if args.input_file else fetch_url(args.url)
  manifest = run_ingestion(
    config=catalog[args.source],
    payload=payload,
    idempotency_key=args.idempotency_key,
    input_name=args.input_file or args.url,
  )
  print(json.dumps(manifest, ensure_ascii=False, indent=2))


if __name__ == "__main__":
  main()

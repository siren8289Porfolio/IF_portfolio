from __future__ import annotations

import importlib
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

DE_ROOT = Path(__file__).resolve().parents[1]
if str(DE_ROOT) not in sys.path:
  sys.path.insert(0, str(DE_ROOT))

try:
  import pandas as pd
  ingestion = importlib.import_module("etl.external_public_ingestion")
except ModuleNotFoundError as exc:
  pd = None
  ingestion = None
  IMPORT_ERROR = exc
else:
  IMPORT_ERROR = None


VALID_XML = """<?xml version="1.0" encoding="UTF-8"?>
<response>
  <body>
    <items>
      <item>
        <dstrCd>11000</dstrCd>
        <dstrName>서울특별시</dstrName>
        <largeClass>SIDO</largeClass>
      </item>
      <item>
        <dstrCd>26000</dstrCd>
        <dstrName>부산광역시</dstrName>
        <largeClass>SIDO</largeClass>
      </item>
    </items>
  </body>
</response>
""".encode("utf-8")

INVALID_XML = """<?xml version="1.0" encoding="UTF-8"?>
<response>
  <body>
    <items>
      <item>
        <dstrName>missing code</dstrName>
      </item>
    </items>
  </body>
</response>
""".encode("utf-8")


class ExternalPublicIngestionTest(unittest.TestCase):
  def setUp(self) -> None:
    if IMPORT_ERROR is not None:
      self.skipTest(f"optional ETL dependency is not installed: {IMPORT_ERROR}")
    self.temp_dir = tempfile.TemporaryDirectory()
    os.environ["IF_EXTERNAL_DATA_DIR"] = self.temp_dir.name
    self.config = ingestion.load_catalog()["self_support_region_code"]

  def tearDown(self) -> None:
    self.temp_dir.cleanup()
    os.environ.pop("IF_EXTERNAL_DATA_DIR", None)

  def test_ingestion_is_idempotent_for_same_window_and_payload(self) -> None:
    first = ingestion.run_ingestion(self.config, VALID_XML, "2026-08", "region.xml")
    second = ingestion.run_ingestion(self.config, VALID_XML, "2026-08", "region.xml")

    self.assertEqual(first["run_key"], second["run_key"])
    self.assertEqual(first["status"], "SUCCESS")
    self.assertEqual(second["status"], "SUCCESS")

    serving = pd.read_parquet(Path(first["serving_path"]))
    self.assertEqual(len(serving), 2)
    self.assertEqual(set(serving["region_code"]), {"11000", "26000"})

    manifest_files = list((Path(self.temp_dir.name) / "manifests").glob("*.json"))
    self.assertEqual(len(manifest_files), 1)

  def test_dq_failure_keeps_serving_snapshot_unmodified(self) -> None:
    manifest = ingestion.run_ingestion(self.config, INVALID_XML, "2026-08-bad", "region.xml")

    self.assertEqual(manifest["status"], "DQ_FAILED")
    self.assertIsNone(manifest["serving_path"])
    self.assertFalse((Path(self.temp_dir.name) / "serving" / "region_master.parquet").exists())

    dq_results = json.loads(Path(manifest["dq_path"]).read_text(encoding="utf-8"))
    failed_checks = [row["check_name"] for row in dq_results if row["status"] == "FAIL"]
    self.assertIn("required_identifier_not_null", failed_checks)


if __name__ == "__main__":
  unittest.main()

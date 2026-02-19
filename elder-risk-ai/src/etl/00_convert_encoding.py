"""
00_convert_encoding.py
----------------------

EUC-KR(또는 CP949) 인코딩으로 된 CSV를 UTF-8 + Parquet으로 변환하는 스크립트.

현재 가정하는 raw 파일:
  - 고용노동부 산업재해현황_20231231.csv
  - 국민건강보험공단_노인장기요양보험 등급판정 현황_20251231.CSV

실행:
  python -m src.etl.00_convert_encoding
"""

from __future__ import annotations

import os
from pathlib import Path

import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "data"
RAW_DIR = DATA_DIR / "raw"
INTERIM_DIR = DATA_DIR / "interim"


RAW_FILES = {
    "moel_accident_2023": "고용노동부 산업재해현황_20231231.csv",
    "nhis_ltc_grade_2025": "국민건강보험공단_노인장기요양보험 등급판정 현황_20251231.CSV",
}


def ensure_dirs() -> None:
  INTERIM_DIR.mkdir(parents=True, exist_ok=True)


def convert_file(key: str, filename: str) -> None:
  src = RAW_DIR / filename
  if not src.exists():
    print(f"[WARN] raw 파일이 없습니다: {src}")
    return

  dst = INTERIM_DIR / f"{key}.parquet"

  # cp949(EUC-KR) 기준으로 읽고, pandas가 UTF-8 객체로 들고 있게 함
  print(f"[INFO] Reading {src} (cp949) ...")
  df = pd.read_csv(src, encoding="cp949")

  # 간단한 공백/컬럼 정리
  df.columns = [str(c).strip() for c in df.columns]

  print(f"[INFO] Writing {dst} (parquet) ...")
  df.to_parquet(dst, index=False)
  print(f"[OK] {key}: {len(df):,} rows -> {dst}")


def main() -> None:
  ensure_dirs()
  for key, filename in RAW_FILES.items():
    convert_file(key, filename)


if __name__ == "__main__":
  main()


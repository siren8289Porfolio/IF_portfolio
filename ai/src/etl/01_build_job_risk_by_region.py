"""
01_build_job_risk_by_region.py
------------------------------

산업재해 현황 데이터를 이용해 지역별 산재 위험 점수(0~100)를 만드는 mart 생성 스크립트.

입력:
  - data/interim/moel_accident_2023.parquet

출력:
  - data/marts/job_risk_by_region.parquet
    * columns:
        - region        : 문자열 (예: '서울청', '부산청' 등)
        - injured_cnt   : 재해자 수
        - death_cnt     : 사망자 수
        - risk_raw      : 가중합 점수 (death*5 + injured*1)
        - risk_score    : 0~100 정규화 점수
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = PROJECT_ROOT / "data"
INTERIM_DIR = DATA_DIR / "interim"
MARTS_DIR = DATA_DIR / "marts"


def ensure_dirs() -> None:
  MARTS_DIR.mkdir(parents=True, exist_ok=True)


def build_job_risk_by_region() -> pd.DataFrame:
  src = INTERIM_DIR / "moel_accident_2023.parquet"
  if not src.exists():
    raise FileNotFoundError(f"중간 파일이 없습니다: {src} (먼저 00_convert_encoding 실행 필요)")

  df = pd.read_parquet(src)

  # 컬럼 이름은 실제 파일에 맞춰 수정할 수 있도록 "포함 여부"로 탐색
  # 예시: '구분', '2023년 재해자수', '2023년 사망자수'
  col_region = next((c for c in df.columns if "구분" in str(c)), None)
  col_injured = next((c for c in df.columns if "재해자수" in str(c)), None)
  col_death = next((c for c in df.columns if "사망자수" in str(c)), None)

  if not col_region or not col_injured or not col_death:
    raise ValueError(
      f"필요한 컬럼을 찾지 못했습니다. 실제 컬럼명 확인 필요\n"
      f"columns = {list(df.columns)}"
    )

  work = df[[col_region, col_injured, col_death]].copy()
  work.rename(
    columns={
      col_region: "region",
      col_injured: "injured_cnt",
      col_death: "death_cnt",
    },
    inplace=True,
  )

  # 결측/문자 → 숫자 변환
  work["injured_cnt"] = pd.to_numeric(work["injured_cnt"], errors="coerce").fillna(0).astype(int)
  work["death_cnt"] = pd.to_numeric(work["death_cnt"], errors="coerce").fillna(0).astype(int)

  # 동일 region 묶어서 합계
  grouped = (
    work.groupby("region", as_index=False)[["injured_cnt", "death_cnt"]]
    .sum()
    .reset_index(drop=True)
  )

  # 사망 1건의 가중치를 재해자 5명 수준으로 크게 잡는 간단 룰
  alpha = 5.0  # death weight
  beta = 1.0   # injured weight
  grouped["risk_raw"] = grouped["death_cnt"] * alpha + grouped["injured_cnt"] * beta

  # 0~100 min-max 정규화
  min_v = grouped["risk_raw"].min()
  max_v = grouped["risk_raw"].max()
  if np.isclose(max_v, min_v):
    grouped["risk_score"] = 0.0
  else:
    grouped["risk_score"] = (grouped["risk_raw"] - min_v) / (max_v - min_v) * 100.0

  return grouped


def main() -> None:
  ensure_dirs()
  df = build_job_risk_by_region()
  dst = MARTS_DIR / "job_risk_by_region.parquet"
  df.to_parquet(dst, index=False)
  print(f"[OK] job_risk_by_region: {len(df):,} rows -> {dst}")


if __name__ == "__main__":
  main()


from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import List

import numpy as np
import pandas as pd

from ..schemas import ScoreRequest, ScoreResponse, ScoreFactor


PROJECT_ROOT = Path(__file__).resolve().parents[3]
DATA_DIR = PROJECT_ROOT / "data"
MARTS_DIR = DATA_DIR / "marts"


@lru_cache(maxsize=1)
def load_job_risk_table() -> pd.DataFrame:
  path = MARTS_DIR / "job_risk_by_region.parquet"
  if not path.exists():
    # 없으면 빈 테이블 반환 (region_score=0으로 처리)
    return pd.DataFrame(columns=["region", "risk_score"])
  df = pd.read_parquet(path)
  # 컬럼 방어적으로 정리
  if "region" not in df.columns:
    raise ValueError(f"job_risk_by_region.parquet 에 'region' 컬럼이 없습니다: {df.columns}")
  if "risk_score" not in df.columns:
    raise ValueError(f"job_risk_by_region.parquet 에 'risk_score' 컬럼이 없습니다: {df.columns}")
  df["region"] = df["region"].astype(str).str.strip()
  return df[["region", "risk_score"]]


def lookup_region_score(region: str) -> float:
  table = load_job_risk_table()
  if table.empty:
    return 0.0
  region_norm = str(region).strip()
  row = table[table["region"] == region_norm]
  if not row.empty:
    return float(row["risk_score"].iloc[0])
  # 완전 일치가 없으면 부분 일치도 시도 (예: '서울' vs '서울청')
  partial = table[table["region"].str.contains(region_norm, na=False)]
  if not partial.empty:
    return float(partial["risk_score"].mean())
  return 0.0


def band_from_score(score: float) -> str:
  """구간: 낮음(0~39), 보통(40~59), 높음(60~79), 매우 높음(80~100)."""
  if score < 40:
    return "낮음"
  if score < 60:
    return "보통"
  if score < 80:
    return "높음"
  return "매우 높음"


def score_from_request(req: ScoreRequest) -> ScoreResponse:
  """
  간단한 PoC용 스코어러.

  - region 기반: 산업재해 mart의 risk_score (0~100)를 그대로 사용
  - job_category / work_intensity / flags는 rule-based 가중치로 약간 조정
  """

  region_score = lookup_region_score(req.region)

  # work_intensity 보정: 파싱 누락 시 physical_level(1~5)로 복구 (건강 나쁨=4,5 → 높음)
  work_intensity_raw = (req.work_intensity or "").strip()
  physical_level = getattr(req, "physical_level", None)
  if not work_intensity_raw and physical_level is not None:
    if physical_level >= 4:
      work_intensity_raw = "높음"
    elif physical_level <= 1:
      work_intensity_raw = "낮음"
    else:
      work_intensity_raw = "중"
  work_intensity = work_intensity_raw or "중"

  # 직무 / 나이 / 강도(건강) / 태그에 따른 가산 (PoC용 룰)
  adjustment = 0.0
  factors: List[ScoreFactor] = []

  # 나이 구간: 고령일수록 위험 가산 (노인 일자리 맥락)
  age_band = (req.age_band or "").strip()
  if age_band == "75+":
    delta = 22.0
    adjustment += delta
    factors.append(
      ScoreFactor(
        name="age_band",
        value=1.0,
        weight=delta,
        description="연령 구간: 75세 이상",
      )
    )
  elif age_band == "70-74":
    delta = 15.0
    adjustment += delta
    factors.append(
      ScoreFactor(
        name="age_band",
        value=1.0,
        weight=delta,
        description="연령 구간: 70~74세",
      )
    )
  elif age_band == "65-69":
    delta = 8.0
    adjustment += delta
    factors.append(
      ScoreFactor(
        name="age_band",
        value=1.0,
        weight=delta,
        description="연령 구간: 65~69세",
      )
    )

  high_risk_jobs = ["건설", "제조", "운수", "물류", "현장", "경비"]
  if any(keyword in req.job_category for keyword in high_risk_jobs):
    delta = 12.0
    adjustment += delta
    factors.append(
      ScoreFactor(
        name="job_category",
        value=1.0,
        weight=delta,
        description="고위험 직무군(건설·제조·운수·물류·경비 등)",
      )
    )

  # 근무 강도(신체 부담) = 건강 상태 반영. "높음" = 건강 나쁨 (위에서 work_intensity 보정됨)
  is_high_intensity = work_intensity == "높음" or "높" in work_intensity
  if work_intensity in ("중", "높음") or (work_intensity and is_high_intensity):
    delta = 10.0 if work_intensity == "중" and not is_high_intensity else 22.0
    adjustment += delta
    factors.append(
      ScoreFactor(
        name="work_intensity",
        value=1.0,
        weight=delta,
        description=f"근무 강도(신체 부담): {work_intensity or '높음'}",
      )
    )

  # 환경 태그 예시: 야간근무, 고소작업, 미끄러운바닥, 중량물취급 ...
  env_weights = {
    "야간": 5.0,
    "고소": 7.0,
    "미끄러운": 5.0,
    "중량물": 7.0,
  }
  env_delta = 0.0
  for flag in req.environment_flags:
    for keyword, w in env_weights.items():
      if keyword in flag:
        env_delta += w
  if env_delta:
    adjustment += env_delta
    factors.append(
      ScoreFactor(
        name="environment_flags",
        value=float(len(req.environment_flags)),
        weight=env_delta,
        description=", ".join(req.environment_flags),
      )
    )

  # 건강 태그 예시: 심혈관, 낙상, 근골격, 인지
  health_weights = {
    "심혈관": 7.0,
    "낙상": 7.0,
    "근골격": 5.0,
    "인지": 5.0,
  }
  health_delta = 0.0
  for flag in req.health_flags:
    for keyword, w in health_weights.items():
      if keyword in flag:
        health_delta += w
  if health_delta:
    adjustment += health_delta
    factors.append(
      ScoreFactor(
        name="health_flags",
        value=float(len(req.health_flags)),
        weight=health_delta,
        description=", ".join(req.health_flags),
      )
    )

  # 최종 점수 = region_score + adjustment, 0~100 클리핑
  raw = region_score + adjustment
  risk_score = float(np.clip(raw, 0.0, 100.0))

  # 방어적 하한선: 노인 일자리 맥락에서 안전(낮음)이 과하게 나오지 않게
  is_elder = age_band in ("65-69", "70-74", "75+")
  is_medium = work_intensity == "중"  # 건강 보통
  if is_elder and is_medium and risk_score < 40.0:
    risk_score = 40.0   # 65세+ + 건강 보통 → 최소 보통 구간 (안전 X)
  if is_high_intensity and risk_score < 60.0:
    risk_score = 60.0   # 건강 나쁨만 있어도 최소 높음
  if age_band in ("70-74", "75+") and risk_score < 55.0:
    risk_score = 55.0  # 고령만 있어도 최소 보통 상단
  if age_band in ("70-74", "75+") and is_high_intensity and risk_score < 72.0:
    risk_score = 72.0  # 고령+건강 나쁨 → 최소 높음~매우 높음

  risk_band = band_from_score(risk_score)

  # 중요도 순으로 정렬된 top_factors
  factors_sorted = sorted(factors, key=lambda f: abs(f.weight), reverse=True)

  return ScoreResponse(
    risk_score=risk_score,
    risk_band=risk_band,
    region_score=region_score,
    rule_based_adjustment=adjustment,
    top_factors=factors_sorted[:5],
  )


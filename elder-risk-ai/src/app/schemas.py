from __future__ import annotations

from typing import List, Optional

from pydantic import BaseModel, Field


class ScoreRequest(BaseModel):
  """위험도 점수 요청 스키마 (로그인 없이도 바로 사용 가능)."""

  age_band: str = Field(..., example="65-69")
  region: str = Field(..., example="서울청")
  job_category: str = Field(..., example="경비·시설관리")
  work_intensity: str = Field(..., example="중")
  environment_flags: List[str] = Field(
    default_factory=list,
    example=["야간근무", "미끄러운바닥"],
  )
  health_flags: List[str] = Field(
    default_factory=list,
    example=["근골격계", "심혈관"],
  )


class ScoreFactor(BaseModel):
  name: str
  value: float
  weight: float
  description: Optional[str] = None


class ScoreResponse(BaseModel):
  risk_score: float = Field(..., ge=0, le=100)
  risk_band: str = Field(..., description="낮음/보통/높음/매우 높음 중 하나")
  region_score: float
  rule_based_adjustment: float
  top_factors: List[ScoreFactor]


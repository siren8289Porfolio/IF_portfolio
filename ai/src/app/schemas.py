from __future__ import annotations

from typing import List, Optional

from pydantic import AliasChoices, BaseModel, ConfigDict, Field


class ScoreRequest(BaseModel):
  """위험도 점수 요청. Spring(camelCase) / Python(snake_case) 둘 다 수용."""

  model_config = ConfigDict(populate_by_name=True)

  age_band: str = Field(..., alias="ageBand", example="65-69")
  region: str = Field(..., example="서울청")
  job_category: str = Field(..., alias="jobCategory", example="경비·시설관리")
  work_intensity: str = Field(..., alias="workIntensity", example="중")
  physical_level: Optional[int] = Field(
    None,
    validation_alias=AliasChoices("physical_level", "physicalLevel"),
    ge=1,
    le=5,
  )
  environment_flags: List[str] = Field(
    default_factory=list,
    alias="environmentFlags",
    example=["야간근무", "미끄러운바닥"],
  )
  health_flags: List[str] = Field(
    default_factory=list,
    alias="healthFlags",
    example=["근골격계", "심혈관"],
  )
  chronic_disease_flag: Optional[bool] = Field(
    None,
    validation_alias=AliasChoices("chronic_disease_flag", "chronicDiseaseFlag"),
    description="만성질환 여부 (HealthSnapshot). True면 health 가중치 가산.",
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
  scoring_version: str = Field(
    default="rule_stat_v1",
    description="Authoritative baseline version (ML.md). Not an LLM/prompt version.",
  )


# --- Explain (LLM 문서화 전용) ---

class FactorExplanation(BaseModel):
  name: str = Field(..., description="위험 요인 이름")
  text: str = Field(..., description="해당 요인 1~2문장 설명")


class ExplainRequest(BaseModel):
  model_config = ConfigDict(populate_by_name=True)

  risk_score: float = Field(..., ge=0, le=100)
  risk_band: str = Field(..., description="낮음/보통/높음/매우 높음 중 하나")
  top_factors: List[ScoreFactor]
  case_summary: str = Field(
    ...,
    description="비식별 케이스 요약",
    example="서울청, 65-69세, 경비·시설관리 직무, 야간근무·미끄러운바닥 환경 등",
  )
  result_id: Optional[str] = Field(
    None,
    alias="resultId",
    description="추적용 authoritative result id",
  )
  result_version: Optional[str] = Field(
    None,
    alias="resultVersion",
    description="결과 스냅샷 버전",
  )


class ExplainResponse(BaseModel):
  summary: str = Field(..., description="총 위험도 한 문단 요약")
  factor_explanations: List[FactorExplanation] = Field(default_factory=list)
  guidance: str = Field(..., description="점수 구간별 해석 가이드")
  disclaimer: str = Field(
    ...,
    description="본 결과는 판단 보조 자료일 뿐이며, 최종 판단과 책임은 담당자에게 있습니다.",
  )
  prompt_version: Optional[str] = Field(None, description="prompt_v1 등")
  model_version: Optional[str] = Field(None, description="Gemini model id")
  fallback: Optional[bool] = Field(
    None,
    description="True면 LLM 미사용/실패 시 deterministic fallback",
  )


from __future__ import annotations

import logging
from pathlib import Path
_env_path = Path(__file__).resolve().parents[2] / ".env"
if _env_path.exists():
    from dotenv import load_dotenv
    load_dotenv(_env_path)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# 기본 로깅 레벨을 INFO로 설정해서 디버그용 로그가 보이도록 함
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

from .schemas import ScoreRequest, ScoreResponse, ExplainRequest, ExplainResponse
from .services.scoring_service import score_from_request
from .services.llm_gemini_service import generate_explanation


app = FastAPI(
  title="Elder Risk AI",
  description="고령자 고용 위험도 PoC용 점수/리스크 API",
  version="0.1.0",
)

app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
  allow_credentials=True,
  allow_methods=["*"],
  allow_headers=["*"],
)


@app.get("/health", summary="헬스 체크")
def health() -> dict[str, str]:
  return {"status": "ok"}


@app.post("/score", response_model=ScoreResponse, summary="고령자 고용 위험 점수 계산")
def score(req: ScoreRequest) -> ScoreResponse:
  """
  지역×직무×근무강도×환경/건강 태그를 받아 0~100 리스크 점수와 주요 요인을 반환합니다.

  사전 준비:
    - `data/marts/job_risk_by_region.parquet` 가 생성되어 있어야 함
      (src/etl/00_convert_encoding.py, src/etl/01_build_job_risk_by_region.py 순서로 실행)
  """
  # Spring이 camelCase로 보내는 경우 파싱된 값 확인용 (디버깅)
  logger.info(
    "score request: age_band=%s work_intensity=%s physical_level=%s job_category=%s",
    getattr(req, "age_band", None),
    getattr(req, "work_intensity", None),
    getattr(req, "physical_level", None),
    getattr(req, "job_category", None),
  )
  return score_from_request(req)


@app.post("/explain", response_model=ExplainResponse, summary="LLM 기반 설명 생성")
def explain(req: ExplainRequest) -> ExplainResponse:
  """점수/요인/비식별 요약으로 설명·가이드·면책 문구만 생성. 점수·결정은 생성하지 않음."""
  return generate_explanation(req)


if __name__ == "__main__":
  import uvicorn

  uvicorn.run("src.app.main:app", host="0.0.0.0", port=8000, reload=True)


from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .schemas import ScoreRequest, ScoreResponse
from .services.scoring_service import score_from_request


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

  return score_from_request(req)


if __name__ == "__main__":
  import uvicorn

  uvicorn.run("src.app.main:app", host="0.0.0.0", port=8000, reload=True)


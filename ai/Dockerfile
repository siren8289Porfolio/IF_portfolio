# syntax=docker/dockerfile:1
FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY src ./src
COPY data/raw ./data/raw

# 빌드 시점에 raw(git 관리 대상) -> interim -> marts 를 결정적으로 재생성.
# 실패해도 이미지 빌드는 계속 진행하고, 앱은 job_risk_by_region.parquet 없이
# region_score=0 폴백으로 기동한다 (scoring_service.load_job_risk_table 참고).
RUN python -m src.etl.00_convert_encoding \
    && python -m src.etl.01_build_job_risk_by_region \
    || echo "[WARN] data mart 생성 실패 - region_score=0 폴백으로 기동합니다"

RUN groupadd -r app && useradd -r -g app app \
    && chown -R app:app /app
USER app

ENV PYTHONUNBUFFERED=1

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -sf http://localhost:8000/health | grep -q '"status":"ok"' || exit 1

CMD ["uvicorn", "src.app.main:app", "--host", "0.0.0.0", "--port", "8000"]

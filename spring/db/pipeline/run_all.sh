#!/usr/bin/env bash
# 파이프라인 1 run: 증분 적재 → 품질 검사 → MV 갱신 → 로그
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DB_NAME="${DB_NAME:-if_spring}"
DB_USER="${DB_USER:-if_user}"
PG_HOST="${PGHOST:-localhost}"
PG_PORT="${PGPORT:-5432}"
export PGPASSWORD="${PGPASSWORD:-change-me}"

RUN_ID=$(psql -h "$PG_HOST" -p "$PG_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc \
  "INSERT INTO pipeline_run_log (job_name, status) VALUES ('full_pipeline', 'RUNNING') RETURNING run_id;")

echo "==> pipeline run_id=${RUN_ID}"

psql -h "$PG_HOST" -p "$PG_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 \
  -f "$SCRIPT_DIR/../analytics/02_refresh_fact.sql"

psql -h "$PG_HOST" -p "$PG_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 \
  -f "$SCRIPT_DIR/../quality/checks.sql"

psql -h "$PG_HOST" -p "$PG_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 \
  -f "$SCRIPT_DIR/refresh_summary.sql"

psql -h "$PG_HOST" -p "$PG_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 <<SQL
UPDATE pipeline_run_log SET
  finished_at = now(),
  processed_row_count = (SELECT count(*) FROM analytics.fact_assessment),
  target_max_updated_at = (SELECT max(source_updated_at) FROM analytics.fact_assessment),
  status = 'SUCCESS'
WHERE run_id = ${RUN_ID};
SQL

echo "==> 파이프라인 완료"

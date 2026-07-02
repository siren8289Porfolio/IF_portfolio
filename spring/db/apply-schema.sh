#!/usr/bin/env bash
# spring/db/ 아래 SQL을 순서대로 적용한다 (로드맵: 설계 → 인덱스 → 제약 → 집계 → 분석).
#
# 사용법:
#   cd spring && ./db/apply-schema.sh
#   cd spring && ./db/apply-schema.sh --seed      # 개발 시드 포함
#   cd spring && ./db/apply-schema.sh --pipeline # 스키마 + 파이프라인 1회 실행

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DB_NAME="${DB_NAME:-if_spring}"
DB_USER="${DB_USER:-if_user}"
PG_HOST="${PGHOST:-localhost}"
PG_PORT="${PGPORT:-5432}"
PGPASSWORD="${PGPASSWORD:-change-me}"
export PGPASSWORD

RUN_SEED=false
RUN_PIPELINE=false
for arg in "$@"; do
  case "$arg" in
    --seed) RUN_SEED=true ;;
    --pipeline) RUN_PIPELINE=true ;;
  esac
done

run_sql() {
  local file="$1"
  echo "==> $(basename "$file")"
  psql -h "$PG_HOST" -p "$PG_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 -f "$file"
}

echo "==> DB 스키마 적용 (${DB_USER}@${PG_HOST}:${PG_PORT}/${DB_NAME})"

# 기존 Hibernate DB에 updated_at 컬럼 보강 (마이그레이션)
psql -h "$PG_HOST" -p "$PG_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 <<'SQL' || true
ALTER TABLE assessment ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE ai_risk_result ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
SQL

for f in "$SCRIPT_DIR"/operational/0*.sql; do
  [[ -f "$f" ]] || continue
  if [[ "$(basename "$f")" == "05_seed_dev.sql" ]] && [[ "$RUN_SEED" != true ]]; then
    continue
  fi
  run_sql "$f"
done

run_sql "$SCRIPT_DIR/analytics/01_star_schema.sql"
run_sql "$SCRIPT_DIR/analytics/02_refresh_fact.sql"

if [[ "$RUN_PIPELINE" == true ]]; then
  echo "==> 파이프라인 실행"
  run_sql "$SCRIPT_DIR/pipeline/refresh_summary.sql"
  psql -h "$PG_HOST" -p "$PG_PORT" -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 \
    -c "INSERT INTO pipeline_run_log (job_name, finished_at, processed_row_count, status)
        SELECT 'apply_schema_bootstrap', now(), (SELECT count(*) FROM analytics.fact_assessment), 'SUCCESS';"
fi

echo ""
echo "완료. 검증:"
echo "  psql ... -f db/verify-db-efficiency.sql"
echo "  psql ... -f db/quality/checks.sql"

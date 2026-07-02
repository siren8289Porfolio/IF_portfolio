#!/usr/bin/env bash
# docker compose postgres 최초 기동 시 /docker-entrypoint-initdb.d/ 에서 실행된다.
set -euo pipefail
DB_DIR="/docker-entrypoint-initdb.d/db"

run_sql() {
  echo "==> $(basename "$1")"
  psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -f "$1"
}

for f in "$DB_DIR"/operational/0*.sql; do
  [[ -f "$f" ]] || continue
  [[ "$(basename "$f")" == "05_seed_dev.sql" ]] && continue
  run_sql "$f"
done

run_sql "$DB_DIR/analytics/01_star_schema.sql"

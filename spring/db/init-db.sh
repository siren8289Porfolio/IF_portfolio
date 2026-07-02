#!/usr/bin/env bash
# 로컬 PostgreSQL에 if_user / if_spring DB를 만든다.
# application.yml 및 docker-compose.yml 과 동일한 계정·DB명을 사용한다.
#
# 사용법 (spring 폴더 기준):
#   ./db/init-db.sh
#   ./gradlew bootRun
#
# Docker로 띄울 경우 이 스크립트 없이:
#   docker compose up --build   (레포 루트에서)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DB_NAME="if_spring"
DB_USER="if_user"
DB_PASS="change-me"
PG_HOST="${PGHOST:-localhost}"
PG_PORT="${PGPORT:-5432}"

# brew postgresql@16 기본 superuser = 현재 macOS 사용자
PG_SUPERUSER="${PG_SUPERUSER:-$(whoami)}"

echo "==> PostgreSQL 연결 확인 (${PG_HOST}:${PG_PORT})"
if ! psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_SUPERUSER" -d postgres -c "SELECT 1" >/dev/null 2>&1; then
  echo "PostgreSQL에 연결할 수 없습니다."
  echo "  brew services start postgresql@16"
  echo "  또는 docker compose up postgres -d"
  exit 1
fi

echo "==> 역할(if_user) 생성"
psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_SUPERUSER" -d postgres -v ON_ERROR_STOP=1 <<SQL
DO \$\$
BEGIN
   IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '${DB_USER}') THEN
      CREATE ROLE ${DB_USER} LOGIN PASSWORD '${DB_PASS}';
   END IF;
END
\$\$;
SQL

echo "==> 데이터베이스(${DB_NAME}) 생성"
if psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_SUPERUSER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'" | grep -q 1; then
  echo "    이미 존재함 — 건너뜀"
else
  createdb -h "$PG_HOST" -p "$PG_PORT" -U "$PG_SUPERUSER" -O "$DB_USER" "$DB_NAME"
  echo "    생성 완료"
fi

# 스키마 자동 적용
"$SCRIPT_DIR/apply-schema.sh" --seed

echo ""
echo "완료. 다음 단계:"
echo "  ./db/apply-schema.sh          # 전체 스키마 적용"
echo "  ./db/apply-schema.sh --seed   # + 개발 시드"
echo "  ./gradlew bootRun"
echo ""
echo "연결 정보:"
echo "  jdbc:postgresql://${PG_HOST}:${PG_PORT}/${DB_NAME}"
echo "  user=${DB_USER}  password=${DB_PASS}"

# Spring DB (PostgreSQL) — 데이터 효율화 로드맵 기반

백엔드 DB는 **`spring/db/`** 가 단일 소스(source of truth)다.  
Hibernate `ddl-auto=validate`만 쓰고, **테이블·인덱스·분석 mart·집계 MV는 SQL로 관리**한다.

## 디렉터리 구조

```
spring/db/
├── init-db.sh                    # Postgres 계정·DB 생성
├── apply-schema.sh               # 운영+분석 스키마 일괄 적용
├── verify-db-efficiency.sql      # EXPLAIN ANALYZE (로드맵 3)
├── operational/                  # 운영 DB (정규화, 로드맵 1)
│   ├── 01_tables.sql           #   6개 핵심 테이블 + pipeline_run_log
│   ├── 02_indexes.sql          #   B-tree + partial index (로드맵 5~6)
│   ├── 03_constraints.sql      #   FK/CHECK/updated_at 트리거
│   ├── 04_summary.sql          #   Materialized View (로드맵 9)
│   └── 05_seed_dev.sql         #   개발 시드 (선택)
├── analytics/                    # Star Schema (로드맵 2)
│   ├── 01_star_schema.sql      #   dim_date/job/applicant + fact_assessment
│   └── 02_refresh_fact.sql       #   updated_at 증분 UPSERT (로드맵 10)
├── quality/
│   └── checks.sql                #   PK/FK/허용값/급감 검사 (로드맵 13)
└── pipeline/
    ├── run_all.sh                #   적재→검사→MV갱신→로그 (로드맵 14)
    └── refresh_summary.sql       #   MV만 갱신
```

## 최초 세팅

```bash
cd spring
chmod +x db/*.sh db/pipeline/*.sh
./db/init-db.sh                  # DB 생성 + apply-schema --seed
./gradlew bootRun
```

이미 DB가 있으면:

```bash
cd spring
./db/apply-schema.sh             # 스키마만 갱신
./db/apply-schema.sh --seed      # + 개발 시드
```

## 파이프라인 (증분 적재 + 품질 + 집계)

```bash
cd spring
./db/pipeline/run_all.sh
```

## 검증

```bash
cd spring
PGPASSWORD=change-me psql -h localhost -U if_user -d if_spring -f db/verify-db-efficiency.sql
PGPASSWORD=change-me psql -h localhost -U if_user -d if_spring -f db/quality/checks.sql
```

## Docker

```bash
docker compose up --build   # postgres 최초 기동 시 docker-init.sh → operational + analytics 스키마
```

## 로드맵 적용 현황

| # | 항목 | 파일 |
|---|---|---|
| 1 | 운영 DB 정규화 | `operational/01_tables.sql` |
| 2 | Star Schema | `analytics/01_star_schema.sql` |
| 3 | EXPLAIN 검증 | `verify-db-efficiency.sql` |
| 5~6 | 인덱스 / Partial | `operational/02_indexes.sql` |
| 9 | Summary (MV) | `operational/04_summary.sql` |
| 10 | 증분 적재 | `analytics/02_refresh_fact.sql` |
| 13 | 품질 테스트 | `quality/checks.sql` |
| 14 | 파이프라인 | `pipeline/run_all.sh` |
| 15 | 실행 로그 | `pipeline_run_log` 테이블 |

미적용 (데이터 규모/MVP): 파티셔닝(7), 클러스터링(8), CDC(11), Spark(12)

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
├── analytics/                    # Star Schema + DA KPI (로드맵 2 / DA-01~04)
│   ├── 01_star_schema.sql      #   dim_date/job/applicant/org/risk_grade + fact
│   ├── 02_refresh_fact.sql       #   updated_at 증분 UPSERT (로드맵 10)
│   └── 03_kpi_views.sql          #   BQ/KPI 뷰 + kpi_definition 카탈로그
├── external/                     # 공공 Reference/Context (운영 도메인과 분리)
│   ├── 01_reference_schema.sql  #   raw snapshot + serving master/reference
│   ├── 02_indexes_constraints.sql
│   └── 03_seed_sources.sql      #   확인된 공공·공식 Source Catalog
├── quality/
│   ├── checks.sql                #   운영 도메인 PK/FK/허용값/급감 검사
│   ├── external_checks.sql       #   Reference DQ gate
│   └── analytics_checks.sql      #   DA grain / governance 가드
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
PGPASSWORD=change-me psql -h localhost -U if_user -d if_spring -f db/quality/external_checks.sql
PGPASSWORD=change-me psql -h localhost -U if_user -d if_spring -f db/quality/analytics_checks.sql
```

## DA KPI (제품·Reference)

스펙: `da/DA.md`. 제품 KPI와 공공 Reference/Context KPI는 `analytics.v_kpi_*` 뷰와 `analytics.kpi_definition`으로 고정한다. KOSIS 등 외부 통계는 cohort context·품질 설명용이며 개인 score/grade를 바꾸지 않는다.

```bash
PGPASSWORD=change-me psql -h localhost -U if_user -d if_spring \
  -c "SELECT kpi_id, evidence_status, version FROM analytics.kpi_definition ORDER BY kpi_id;"
PGPASSWORD=change-me psql -h localhost -U if_user -d if_spring \
  -c "SELECT * FROM analytics.v_kpi_finalization_rate ORDER BY full_date DESC LIMIT 14;"
```

## 공공 Reference/Context 분리

`external_ref` 스키마는 공공데이터 수집과 serving 전용이다. `applicant`, `health_snapshot`, `assessment`, `ai_risk_result` 등 운영 도메인 테이블은 외부 수집 성공 여부와 FK로 묶지 않는다. 따라서 외부 API 장애나 schema drift가 발생해도 핵심 평가 트랜잭션은 기존 운영 테이블 기준으로 계속 동작한다.

주요 테이블:

| layer | table |
|---|---|
| source contract | `external_ref.source_catalog` |
| raw immutable | `external_ref.raw_external_snapshot` |
| run/DQ/lineage | `external_ref.external_ingestion_run`, `external_ref.dq_check_result`, `external_ref.lineage_event` |
| serving | `external_ref.region_master`, `external_ref.organization_master`, `external_ref.job_posting_reference`, `external_ref.job_reference`, `external_ref.elderly_employment_snapshot`, `external_ref.ai_job_risk_profile` |

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
| DE-01~05 | 공공 Source Catalog / raw→serving / DQ / lineage / 실패 격리 | `external/`, `quality/external_checks.sql`, `ai/src/etl/02_external_public_ingestion.py` |
| DA-01~04 | BQ/KPI 정의 · grain · Star/Event · governance | `da/DA.md`, `analytics/03_kpi_views.sql`, `quality/analytics_checks.sql` |

미적용 (데이터 규모/MVP): 파티셔닝(7), 클러스터링(8), CDC(11), Spark(12). Event 기반 Explain Fallback·p95 Latency는 PLANNED.

# DB

PostgreSQL 운영·분석 스키마와 파이프라인의 **단일 소스**입니다.

공공 Reference(DDL·DQ)는 DE 역할 폴더 [`../de/`](../de/) 에 있습니다.  
`./db/apply-schema.sh` 가 `db/` + `de/external/` 을 함께 적용합니다.

## 구조

```text
db/
├── operational/           # OLTP 테이블·인덱스·제약·Summary MV
├── analytics/             # Star Schema · KPI 뷰 (DA)
├── quality/               # 운영 / analytics DQ
├── pipeline/              # 증분 적재 · MV 갱신
├── apply-schema.sh
├── init-db.sh
├── docker-init.sh
└── verify-db-efficiency.sql
```

| 영역 | 경로 | 역할 |
| --- | --- | --- |
| 운영 OLTP | `db/operational/` | 테이블·인덱스·제약·Summary MV |
| 분석 Star Schema | `db/analytics/` | dim/fact · KPI 뷰 |
| 품질 검사 | `db/quality/` | 운영 / analytics DQ |
| 파이프라인 | `db/pipeline/` | 증분 적재 · MV 갱신 |
| 공공 Reference (DE) | [`../de/external/`](../de/external/) | Source Catalog · raw · serving |
| DE DQ | [`../de/quality/external_checks.sql`](../de/quality/external_checks.sql) | external_ref only |

## 관련 스펙

- Data Engineering (DE-01~05): [`../de/DE.md`](../de/DE.md)
- Data Analytics (DA-01~04): [`../da/DA.md`](../da/DA.md)
- 저장소·연결 요약: [`../da/DATA.md`](../da/DATA.md)

## 빠른 시작

```bash
# 레포 루트에서
chmod +x db/*.sh db/pipeline/*.sh
./db/init-db.sh                  # 최초: DB 생성 + 스키마
./db/apply-schema.sh             # 스키마만 갱신
./db/pipeline/run_all.sh         # 적재 → 품질 → MV
```

검증:

```bash
PGPASSWORD=change-me psql -h localhost -U if_user -d if_spring -f db/quality/checks.sql
PGPASSWORD=change-me psql -h localhost -U if_user -d if_spring -f de/quality/external_checks.sql
PGPASSWORD=change-me psql -h localhost -U if_user -d if_spring -f db/quality/analytics_checks.sql
```

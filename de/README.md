# DE

Data Engineering (공공 Reference/Context) 구현은 전부 `de/` 안에 있습니다.

## 구조

```text
de/
├── DE.md                              # DE-01~05 스펙
├── etl/
│   ├── external_public_ingestion.py   # raw→serving 파서/ETL
│   └── external_sources.json          # Source field map
├── external/                          # Source Catalog · serving DDL
├── quality/external_checks.sql        # external_ref DQ gate
├── data/external/                     # raw / validated / serving / lineage
└── tests/test_external_public_ingestion.py
```

## 실행

```bash
# 스키마 (db + de/external)
./db/apply-schema.sh

# 파일 ETL (레포 루트 또는 de/)
cd de
PYTHONPATH=. python3 -m etl.external_public_ingestion \
  --source self_support_region_code \
  --input-file ../ai/data/raw/sample_region.xml \
  --idempotency-key 2026-08

# DQ
PGPASSWORD=change-me psql -h localhost -U if_user -d if_spring -f quality/external_checks.sql

# 테스트
PYTHONPATH=. python3 -m unittest discover -s tests
```

운영 OLTP·분석 mart는 [`../db/`](../db/) 를 보세요.

# DE — Data Engineering Specification

<aside>

**프로젝트:** IF · **분류:** DE · **상태:** DE-01~05 통합 (공공 Reference/Context 파이프라인)

공공·공식 데이터는 개인 score/grade의 정답(label)이 아니다. 지역·기관·공고·고용·산재 **Reference/Context**만 제공한다. 수집 실패·schema drift·DQ 실패는 serving 반영을 멈추되, Applicant/Assessment 운영 트랜잭션은 중단하지 않는다.

</aside>

## 1. Scope

```text
Source Catalog → extract → raw immutable snapshot
  → schema check / normalize / dedupe
  → DQ gate → serving → lineage / manifest
```

- **In scope:** 공공 OpenAPI·파일·KOSIS 수집, raw 보존, DQ, serving 테이블/파일, lineage
- **Out of scope:** 개인 Applicant/Health/Assessment OLTP 스키마 변경, 개인 score 재산정

구현 소스(단일 구현 경로, 문서는 링크만):

| Layer | Path |
| --- | --- |
| Source contract / serving DDL | `spring/db/external/` |
| DQ gate | `spring/db/quality/external_checks.sql` |
| File ETL + XML/JSON/CSV parser | `ai/src/etl/02_external_public_ingestion.py` |
| Source field map | `ai/src/etl/external_sources.json` |
| File snapshot root | `ai/data/external/` (`raw`, `validated`, `serving`, `manifests`, `lineage`) |

---

## 2. DE-01~05 Mapping

| ID | 내용 | 산출물 | Evidence |
| --- | --- | --- | --- |
| DE-01 | Source Catalog | `external_ref.source_catalog`, `external_sources.json`, `external/03_seed_sources.sql` | IMPLEMENTED |
| DE-02 | raw → serving 파이프라인 | `02_external_public_ingestion.py`, `raw_external_snapshot` → serving masters | IMPLEMENTED |
| DE-03 | DQ gate | `quality/external_checks.sql`, run status `DQ_FAILED` | IMPLEMENTED |
| DE-04 | Lineage / manifest | `external_ref.lineage_event`, `ai/data/external/lineage|manifests` | IMPLEMENTED |
| DE-05 | 실패 격리 | `is_required_for_core=false`, 운영 테이블과 FK 비연결, FAIL 시 serving 중단만 | IMPLEMENTED |

---

## 3. Source Catalog (DE-01)

확인된 공공·공식 소스(시드와 동기화):

| source | type | serving target | note |
| --- | --- | --- | --- |
| 노인사회활동 시스템 코드 | OPENAPI_XML | region / organization | 활용신청·한도 재확인 |
| 자립형일자리 코드 | OPENAPI_XML | region_master | |
| 자립형일자리 수행기관 | OPENAPI_XML | organization_master | |
| 자립형일자리 사업모집공고 | OPENAPI_XML | job_posting_reference | |
| 노인 구인정보 Senuri | OPENAPI_XML | job_posting_reference | |
| 노인일자리 통합정보 | FILE_CSV | job_reference | |
| 노인일자리사업 홈페이지 공고 | FILE_CSV | job_posting_reference | |
| 보건복지부 시도별 사업현황 | FILE_CSV | elderly_employment_snapshot | Context only |
| 산업재해통계 마이크로데이터 | FILE_XLSX | ai_job_risk_profile | 집단 대리변수 |
| KOSIS OpenAPI | KOSIS | elderly_employment_snapshot | Context only |

모든 소스는 `is_required_for_core = false`다. 핵심 평가 경로는 외부 freshness에 의존하지 않는다.

---

## 4. Pipeline & Parser (DE-02)

`02_external_public_ingestion.py` 파서 계약:

1. **extract** — `--input-file` 또는 `--url` (카탈로그 페이지가 아닌 실제 endpoint)
2. **parse** — `OPENAPI_XML` / `OPENAPI_JSON`·`KOSIS` / `FILE_*`(CSV) payload → row dict 목록
3. **normalize** — `external_sources.json` field_map으로 표준 컬럼 매핑
4. **DQ** — required_fields · 타입·범위 검사; 실패 시 run `DQ_FAILED` / `SCHEMA_DRIFT`
5. **serving** — 통과 row만 parquet/serving 경로 기록 (DB serving은 `spring/db/external/` 스키마와 정합)
6. **idempotency** — `(source_id, idempotency_key)` 유일; 동일 키 재실행은 재현 가능해야 함

```bash
cd ai
PYTHONPATH=. python3 -m src.etl.02_external_public_ingestion \
  --source self_support_region_code \
  --input-file data/raw/sample_region.xml \
  --idempotency-key 2026-08
```

---

## 5. DQ Gate (DE-03)

`spring/db/quality/external_checks.sql`은 **external_ref only**다.

- natural key 중복 금지 (`source_name`, `source_key`)
- 필수 식별자 NULL/blank 금지
- 공고 기간 역전·모집인원 음수 등 domain rule

운영 도메인 `quality/checks.sql`과 분리한다. DQ FAIL은 외부 serving 반영만 막는다.

---

## 6. Lineage (DE-04)

| store | 용도 |
| --- | --- |
| `external_ref.lineage_event` | from_layer → to_layer, row_count, checksum |
| `external_ref.external_ingestion_run` | run status, accepted/rejected counts |
| `ai/data/external/manifests` · `lineage` | 파일 파이프라인 재현 메타 |

raw snapshot(`raw_external_snapshot`)은 checksum 기준 immutable이다.

---

## 7. Failure Isolation (DE-05)

```text
외부 API 장애 / schema drift / DQ FAIL
  → raw·run 로그 보존
  → serving upsert 중단
  → Applicant / Assessment / Health OLTP 계속
```

금지:

- 외부 통계로 개인 score/grade 변경
- 운영 테이블에 외부 source FK 강제
- 수집 실패로 compute-risk 트랜잭션 abort

---

## 8. Serving Targets

| table | role |
| --- | --- |
| `region_master` | 지역 코드 Reference |
| `organization_master` | 수행기관 Reference |
| `job_posting_reference` | 공고 Reference |
| `job_reference` | 일자리 통합 Reference |
| `elderly_employment_snapshot` | 고용 Context (집단) |
| `ai_job_risk_profile` | 직무/업종 위험 대리변수 (집단) |

스키마 적용:

```bash
cd spring
./db/apply-schema.sh
PGPASSWORD=change-me psql -h localhost -U if_user -d if_spring -f db/quality/external_checks.sql
```

---

## 9. Related Specs

- DB 구조·파이프라인 안내: [`../db/README.md`](../db/README.md), `spring/db/README.md`
- DA KPI / grain: [`../da/DA.md`](../da/DA.md)
- 저장소 요약: [`../da/DATA.md`](../da/DATA.md)
- QA release gate: [`../QA.md`](../QA.md)

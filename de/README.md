# IF — 공공 Reference/Context 데이터 파이프라인 및 실패 격리 설계

> **공공·공식 데이터를 개인 평가의 정답으로 사용하지 않고 Reference/Context로 분리해, Source Catalog → Immutable Raw Snapshot → Schema Check/Normalize/Dedupe → DQ Gate → Serving → Lineage 구조를 구현한 Data Engineering 프로젝트**

* **프로젝트 구분:** 개인 프로젝트
* **핵심 역할:** Source Contract 설계, Public Data Ingestion, Schema Normalization, DQ Gate, Idempotency, Lineage, Failure Isolation
* **기술 스택:** Python, PostgreSQL, SQL, XML/JSON/CSV Parser, KOSIS/OpenAPI, Docker
* **주요 영역:** Data Engineering / Data Quality / Data Lineage / Operational Reliability

---

# 1. 문제 상황 및 요구사항

## 1-1. 프로젝트 배경

IF의 DE 영역은 Applicant·Assessment 같은 운영 데이터와 별도로 공공·공식 데이터를 수집해 지역·기관·공고·고용·산재 정보를 **Reference/Context**로 제공하는 구조입니다.

중요한 설계 원칙은 다음과 같습니다.

```text
공공 데이터
≠
개인 평가 Score의 정답 Label
```

즉 공공 통계가 특정 사용자의 점수나 등급을 직접 바꾸도록 만들지 않고, 분석과 판단에 필요한 주변 맥락만 제공합니다.

전체 흐름은 다음과 같습니다.

```text
Source Catalog
→ Extract
→ Raw Immutable Snapshot
→ Schema Check
→ Normalize
→ Dedupe
→ DQ Gate
→ Serving
→ Lineage / Manifest
```

---

## 1-2. 발생 가능한 문제

### 문제 1. 외부 데이터 장애가 핵심 서비스까지 전파될 위험

IF의 핵심 서비스는 Applicant / Assessment / Health 등 운영 Transaction입니다.

그런데 외부 OpenAPI나 파일 수집이 이 흐름과 강하게 연결되면:

```text
외부 API 장애
→ 공공 데이터 수집 실패
→ compute-risk 실패
→ 핵심 서비스 중단
```

과 같은 문제가 생길 수 있습니다.

따라서 외부 Reference Pipeline과 핵심 OLTP를 분리해야 했습니다.

---

### 문제 2. 공공 API마다 Schema가 다름

수집 대상은 XML, JSON/KOSIS, CSV 등 서로 형식이 다릅니다.

```text
OPENAPI_XML
OPENAPI_JSON
KOSIS
FILE_CSV
```

같은 "지역 코드", "기관", "공고" 데이터라도 원본 필드명이 서로 다를 수 있습니다.

따라서 원본 필드를 바로 Serving에 적재하면 Source 추가 시마다 downstream 구조가 흔들릴 위험이 있었습니다.

---

### 문제 3. Schema Drift와 DQ 실패 데이터가 Serving까지 전파될 위험

외부 기관의 API Schema가 변경되거나 필수 Identifier가 누락될 수 있습니다.

또 다음과 같은 Domain Error도 발생할 수 있습니다.

```text
모집 시작일 > 종료일
모집인원 < 0
필수 식별자 NULL
동일 natural key 중복
```

이런 데이터를 그대로 Serving에 반영하면 분석과 AI가 잘못된 Reference를 소비하게 됩니다.

---

### 문제 4. 동일 Batch 재실행 시 중복 적재

외부 API 수집은 네트워크 오류나 수동 재실행 때문에 같은 기간을 다시 수집할 수 있습니다.

단순 INSERT 구조라면:

```text
2026-08 batch 실행
→ 데이터 적재

같은 batch 재실행
→ 동일 데이터 추가 적재
```

가 발생할 수 있습니다.

따라서 Batch 자체에 안정적인 Idempotency Key가 필요했습니다.

---

### 문제 5. 데이터가 어디서 왔는지 추적하기 어려움

Serving Table의 한 Row가 잘못됐을 때:

```text
어느 Source였는가?
어느 Raw Snapshot인가?
몇 건이 처리되었는가?
어느 단계에서 변환되었는가?
```

를 알 수 없다면 문제를 재현하거나 수정하기 어렵습니다.

따라서 Lineage와 Manifest가 필요했습니다.

---

# 2. 해결 요구사항

DE 관점의 주요 요구사항을 다음과 같이 정리했습니다.

* 모든 외부 데이터 Source를 Catalog로 관리한다.
* Raw Snapshot은 Immutable하게 보존한다.
* XML / JSON / KOSIS / CSV를 하나의 Parser Contract로 처리한다.
* Source별 Field Mapping을 코드와 분리한다.
* Schema Validation과 Domain DQ를 수행한다.
* DQ 실패 시 Serving 반영을 차단한다.
* 동일 `(source_id, idempotency_key)` 재실행 시 결과가 재현 가능해야 한다.
* Accepted / Rejected Row Count를 Run 단위로 기록한다.
* Source → Raw → Serving까지 Lineage를 추적한다.
* 외부 Pipeline 실패가 Applicant / Assessment OLTP를 중단시키지 않아야 한다.

---

# 3. 원인 분석

## 3-1. 외부 Reference와 Operational Data의 책임이 다름

IF의 운영 데이터는 핵심 서비스의 Source of Truth입니다.

반면 공공 데이터는:

```text
지역 정보
기관 정보
구인/공고 정보
고용 현황
산재 통계
```

같은 Reference/Context입니다.

따라서 구조적으로:

```text
Applicant / Assessment OLTP
≠
External Reference Data
```

로 분리해야 했습니다.

실제로 모든 Source는 `is_required_for_core = false`로 정의되어 있습니다.

---

## 3-2. Source별 Parser를 계속 만드는 방식은 확장성이 낮음

Source 하나마다:

```text
XML parser A
JSON parser B
CSV parser C
```

를 별도 구현하면 Source가 늘어날수록 코드 중복이 늘어납니다.

그래서 Parsing 로직과 Field Mapping을 분리했습니다.

```text
Parser
→ 형식 해석

external_sources.json
→ Source별 Field Mapping
```

이 구조를 사용하면 Parser의 공통 흐름은 유지하면서 Source Contract만 바꿀 수 있습니다.

---

# 4. 문제 해결 및 적용 과정

## Step 1. Source Catalog 구성

외부 데이터 Source를 Catalog로 관리했습니다.

구현 경로는:

```text
de/external/
de/etl/external_sources.json
```

입니다.

대표 Source는 다음과 같습니다.

| Source         | Type        | Serving Target              |
| -------------- | ----------- | --------------------------- |
| 노인사회활동 시스템 코드  | OPENAPI_XML | region / organization       |
| 자립형일자리 코드      | OPENAPI_XML | region_master               |
| 자립형일자리 수행기관    | OPENAPI_XML | organization_master         |
| 자립형일자리 사업모집공고  | OPENAPI_XML | job_posting_reference       |
| 노인 구인정보 Senuri | OPENAPI_XML | job_posting_reference       |
| 노인일자리 통합정보     | FILE_CSV    | job_reference               |
| 보건복지부 시도별 사업현황 | FILE_CSV    | elderly_employment_snapshot |
| 산업재해통계 마이크로데이터 | FILE_XLSX   | ai_job_risk_profile         |
| KOSIS OpenAPI  | KOSIS       | elderly_employment_snapshot |

즉 Source URL이나 Parser 설정을 코드에 여기저기 하드코딩하지 않고 Catalog 중심으로 관리했습니다.

---

## Step 2. Raw Immutable Snapshot 보존

수집된 원본은 바로 Serving에 넣지 않고 Raw Snapshot으로 먼저 보존합니다.

```text
External Source
      ↓
Raw Snapshot
      ↓
Immutable
```

Repository에서는:

```text
de/data/external/raw
```

영역과 `raw_external_snapshot` 구조를 사용합니다.

Raw Snapshot은 checksum 기준으로 Immutable하게 관리합니다.

이 구조를 통해:

```text
원본 재확인
재처리
Schema Drift 비교
오류 재현
```

이 가능해집니다.

---

## Step 3. 공통 Parser Contract 구현

핵심 ETL 구현은:

```text
de/etl/external_public_ingestion.py
```

에 있습니다.

처리 흐름은 다음과 같습니다.

```text
1. Extract
2. Parse
3. Normalize
4. DQ
5. Serving
6. Idempotency
```

---

## Step 4. XML / JSON / CSV 형식 통합

Parser는 다음 Payload Type을 처리합니다.

```text
OPENAPI_XML
OPENAPI_JSON
KOSIS
FILE_CSV
```

각 형식을 Python Row Dict로 변환한 뒤 동일 Normalize 단계로 전달합니다.

즉:

```text
XML ─┐
JSON ├→ row dict → Normalize
CSV ─┘
```

형태로 Source Format과 downstream 로직을 분리했습니다.

---

## Step 5. Source Field Map 기반 Normalize

Source마다 다른 필드 이름을 `external_sources.json`의 `field_map`으로 표준 컬럼에 매핑합니다.

```text
Source Original Field
        ↓
external_sources.json
        ↓
Standard Field
```

이 방식으로 Source별 컬럼 차이가 Serving Schema까지 직접 전파되는 것을 줄였습니다.

---

# 5. Data Quality Gate

## Step 6. Required Field / Type / Range 검사

Normalize된 데이터는 Serving 전에 검증합니다.

주요 검사 기준은 다음과 같습니다.

```text
Required Fields
Type
Range
Natural Key
Domain Rule
```

---

## Step 7. Natural Key 중복 검사

External Reference Table에서 동일 데이터가 반복 생성되는 것을 막기 위해:

```text
source_name
source_key
```

기준 natural key 중복을 금지합니다.

---

## Step 8. Domain Rule 검사

단순 NULL 검사 외에도 업무 규칙을 포함했습니다.

예:

```text
공고 시작일 <= 종료일
모집인원 >= 0
필수 식별자 != NULL / blank
```

즉 DQ를 Schema 수준에서 끝내지 않고 Domain-level Validation까지 확장했습니다.

---

## Step 9. DQ Failure 시 Serving 차단

가장 중요한 부분입니다.

```text
Raw
 ↓
Normalize
 ↓
DQ

PASS
→ Serving

FAIL
→ DQ_FAILED
→ Serving 반영 중단
```

잘못된 데이터를 "일단 넣고 나중에 고치는" 구조가 아니라, **DQ Gate를 통과한 데이터만 Serving에 반영**하도록 했습니다.

---

# 6. Schema Drift 대응

Parser는 Schema가 예상과 다르면:

```text
SCHEMA_DRIFT
```

상태로 처리합니다.

흐름은:

```text
External Source 변경
      ↓
Schema Check 실패
      ↓
SCHEMA_DRIFT
      ↓
Raw / Run Log 보존
      ↓
Serving Upsert 중단
```

입니다.

즉 외부 제공기관이 컬럼을 바꾸더라도 조용히 잘못된 Mapping을 적용하지 않도록 했습니다.

---

# 7. Idempotency

## Step 10. `(source_id, idempotency_key)` 유일성

동일 Batch 재실행을 안전하게 만들기 위해 다음 조합을 사용합니다.

```text
(source_id, idempotency_key)
```

예를 들어:

```bash
--source self_support_region_code
--idempotency-key 2026-08
```

로 실행할 수 있습니다.

이를 통해:

```text
동일 Source
+
동일 Period
→ 동일 Batch Identity
```

를 유지합니다.

---

# 8. Lineage / Manifest

## Step 11. Lineage Event 기록

Lineage는 다음 구조로 관리합니다.

```text
external_ref.lineage_event
```

기록 항목은:

```text
from_layer
to_layer
row_count
checksum
```

입니다.

---

## Step 12. Ingestion Run Metadata 기록

Run 단위로:

```text
external_ref.external_ingestion_run
```

을 사용해 다음 정보를 관리합니다.

```text
Run Status
Accepted Count
Rejected Count
```

파일 기반 Pipeline은:

```text
de/data/external/manifests
de/data/external/lineage
```

에도 재현 Metadata를 남깁니다.

---

# 9. Failure Isolation

## Step 13. 외부 Pipeline과 Core Transaction 분리

IF DE에서 가장 중요한 운영 안정성 설계입니다.

```text
외부 API 장애
Schema Drift
DQ Fail
        ↓
Raw / Run Log 보존
        ↓
External Serving 중단

BUT

Applicant
Assessment
Health
OLTP
→ 계속 정상 동작
```

이를 위해 외부 Reference Table은 운영 테이블과 강제 FK로 연결하지 않습니다.

또 금지 규칙도 명시했습니다.

```text
외부 통계로 개인 Score/Grade 변경 X

외부 Source FK를 운영 테이블에 강제 X

수집 실패로 compute-risk Transaction Abort X
```

---

# 10. Serving 구조

DQ를 통과한 데이터는 다음 Serving Target으로 제공합니다.

| Table                         | 역할               |
| ----------------------------- | ---------------- |
| `region_master`               | 지역코드 Reference   |
| `organization_master`         | 수행기관 Reference   |
| `job_posting_reference`       | 공고 Reference     |
| `job_reference`               | 일자리 통합 Reference |
| `elderly_employment_snapshot` | 집단 고용 Context    |
| `ai_job_risk_profile`         | 직무/업종 위험 대리변수    |

구조적으로:

```text
Raw Source
     ↓
Validated Data
     ↓
Serving Master / Snapshot
     ↓
AI / DA / Application Context
```

로 사용됩니다.

---

# 11. 실행 및 검증

Repository에서 제공하는 실행 흐름은 다음과 같습니다.

```bash
# Schema
./db/apply-schema.sh
```

```bash
# File ETL
cd de

PYTHONPATH=. python3 -m etl.external_public_ingestion \
  --source self_support_region_code \
  --input-file ../ai/data/raw/sample_region.xml \
  --idempotency-key 2026-08
```

```bash
# DQ
PGPASSWORD=change-me \
psql -h localhost \
-U if_user \
-d if_spring \
-f quality/external_checks.sql
```

```bash
# Test
PYTHONPATH=. python3 -m unittest discover -s tests
```

---

# 12. 해결 결과 및 성과

IF의 DE 프로젝트는 latency를 몇 % 줄이는 성능 튜닝 프로젝트가 아닙니다.

성과는 **데이터 안정성과 운영 장애 격리**에 있습니다.

| 영역        | 기존 위험                  | 개선 후                     |
| --------- | ---------------------- | ------------------------ |
| Source 관리 | 개별 구현/하드코딩             | Source Catalog           |
| Raw       | 바로 변환 가능               | Immutable Snapshot       |
| Format    | Source별 Parser 분리 가능   | XML/JSON/CSV 공통 Pipeline |
| Schema    | 변경 자동 반영 위험            | Schema Drift 감지          |
| DQ        | 잘못된 데이터 Serving 가능     | DQ Gate                  |
| 재실행       | Duplicate 가능           | Idempotency Key          |
| 추적        | 출처 확인 어려움              | Lineage + Manifest       |
| 외부 장애     | Core Transaction 영향 가능 | Failure Isolation        |
| Serving   | 원본 직접 사용               | 표준 Reference Table       |

---

# 13. DBA 관점에서 가져갈 수 있는 부분

이 프로젝트의 DBA 포인트는 Query Tuning보다는 **Data Reliability와 Schema Boundary**입니다.

## ① Data Integrity

```text
Natural Key
Required Field
Domain Rule
DQ Gate
```

## ② External/Internal Schema Isolation

```text
external_ref
≠
Applicant / Assessment OLTP
```

## ③ Failure Isolation

```text
External API Failure
≠
Core DB Transaction Failure
```

## ④ Data Auditability

```text
Run Status
Accepted / Rejected Count
Checksum
Lineage
```

따라서 DBA 포트폴리오에서는 **운영 DB 안정성을 외부 Reference 장애로부터 격리한 설계**로 설명하는 것이 좋습니다.

---

# 14. DE 관점 핵심 성과

IF DE의 핵심은 다음 흐름입니다.

```text
Source Catalog
      ↓
Extract
      ↓
Raw Immutable Snapshot
      ↓
Schema Check
      ↓
Normalize
      ↓
Dedupe
      ↓
DQ Gate
      ↓
Serving
      ↓
Lineage
```

여기에 두 가지 중요한 운영 원칙이 붙습니다.

```text
Idempotency
+
Failure Isolation
```

즉 단순히 공공데이터를 가져온 것이 아니라 **재실행 가능하고, 검증 가능하고, 장애가 격리되는 Public Data Pipeline**을 만든 프로젝트입니다.

---

# 15. 문제 해결 흐름 요약

```text
[Problem]

다양한 공공 Source
+
Schema 변경
+
잘못된 데이터
+
외부 장애
+
재실행 중복 위험

        ↓

[Root Cause]

Source Contract 부재
Raw 보존 부재
DQ Gate 부재
Operational DB와 외부 Pipeline 경계 부족

        ↓

[Action]

Source Catalog
→ Immutable Raw
→ Parser Contract
→ Field Mapping
→ Schema Validation
→ DQ Gate
→ Idempotency
→ Lineage
→ Failure Isolation

        ↓

[Result]

외부 데이터 오류/장애 발생 시
Serving만 차단하고

Applicant / Assessment Core OLTP는
정상 운영되는 데이터 파이프라인 구성
```

---

# 16. 회고 및 배운 점

첫째, 외부 데이터를 많이 연결하는 것보다 **외부 데이터가 실패했을 때 핵심 서비스가 어떻게 동작해야 하는지 정의하는 것이 더 중요하다**는 점을 배웠습니다.

둘째, Raw Snapshot을 보존하지 않으면 Schema Drift나 DQ 오류가 발생했을 때 원본 상태를 다시 재현하기 어렵기 때문에 Immutable Raw가 Data Engineering의 중요한 기반이라는 점을 확인했습니다.

셋째, XML/JSON/CSV처럼 Format이 달라도 Normalize 이후의 처리 계약은 동일하게 유지할 수 있다는 점에서 Parser와 Field Mapping을 분리하는 설계가 Source 확장에 유리했습니다.

넷째, Data Quality는 단순 NULL 검사보다 Domain Rule까지 포함해야 했습니다. 특히 공고 기간 역전이나 음수 모집인원 같은 데이터는 Schema상 정상이어도 업무적으로 잘못된 값입니다.

다섯째, Pipeline의 재실행은 예외 상황이 아니라 일반 운영 시나리오이므로 처음부터 Idempotency Key와 Run Metadata를 설계해야 중복과 추적 문제를 방지할 수 있다는 점을 배웠습니다.

---

# 17. 현재 프로젝트에서 주장하지 않는 것

현재 `de/` 구현과 문서가 지원하지 않는 내용은 성과로 적지 않습니다.

* 1,000만 건 이상 대용량 처리
* Spark 분산처리
* Kafka
* Debezium CDC
* Airflow 실제 운영 Orchestration
* dbt 실제 구현
* AWS Glue / DMS
* BigQuery / Snowflake
* Streaming Pipeline
* 처리시간 XX% 개선
* TPS 개선
* DB CPU 개선
* HA / Failover
* Backup / Restore 자동화

현재 Repository에서 명확히 확인되는 핵심은 **Public Data Ingestion, Immutable Raw, Schema Validation, DQ Gate, Idempotency, Lineage, Failure Isolation**입니다.

---

# 18. 포트폴리오용 최종 설명

> **IF에서 공공·공식 데이터를 개인 평가의 Label이 아닌 Reference/Context로 분리하고, `Source Catalog → Extract → Immutable Raw Snapshot → Schema Check/Normalize/Dedupe → DQ Gate → Serving → Lineage` 구조의 Data Engineering Pipeline을 구현했습니다. `external_public_ingestion.py`에서 XML·JSON/KOSIS·CSV Payload를 공통 Row 구조로 Parsing하고, `external_sources.json` Field Map을 통해 Source별 Schema를 표준 Serving Schema로 정규화했습니다. Natural Key 중복, 필수 Identifier, 기간 역전, 음수 모집인원 등의 Data Quality Rule을 적용하고 실패 시 `DQ_FAILED` 또는 `SCHEMA_DRIFT` 상태로 Serving 반영을 중단하도록 구성했습니다. 또한 `(source_id, idempotency_key)` 기반 재실행 안정성과 Accepted/Rejected Count, Checksum, Lineage Event를 기록해 Pipeline을 재현 가능하게 했습니다. 외부 API 장애나 DQ 실패가 발생하더라도 Applicant·Assessment·Health 핵심 OLTP는 계속 동작하도록 External Reference와 운영 Transaction을 격리했습니다.**

## 한 줄 성과

> **다양한 공공데이터를 Immutable Raw·Schema Validation·DQ Gate·Idempotency·Lineage 구조로 표준화하고, 외부 데이터 장애를 핵심 OLTP와 격리한 재현 가능한 Reference Data Pipeline을 구현했습니다.**

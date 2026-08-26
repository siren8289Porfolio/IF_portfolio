# DA — Data Analytics Specification

<aside>

**프로젝트:** IF · **분류:** DA · **상태:** DA-01~04 통합 + 공공데이터 Analytics 확장

분석은 제품·운영 의사결정을 지원하며, 관찰 데이터의 상관을 인과로 과장하지 않는다. 외부 통계로 개인 score를 변경하거나 개인의 취업 가능성을 추론하지 않는다.

</aside>

## 1. Analytics Scope

Business Question → KPI Definition → Analysis Design → Event/Data Architecture 순으로 연결한다.

IF DA의 두 축:

1. **제품·운영 분석** — Assessment 흐름, 위험 등급 분포, 처리 시간, FINALIZED 비율
2. **공공 Reference·Context 분석** — Job/기관/지역 매핑 품질, 데이터 freshness, KOSIS cohort context

---

## 2. Business Questions

| ID | 질문 | 의사결정 |
| --- | --- | --- |
| BQ-01 | 평가 건수·FINALIZED 비율은 추이인가? | 운영 부하·채택 |
| BQ-02 | 위험 등급(LOW/MID/HIGH) 분포는? | 정책·교육 |
| BQ-03 | compute-risk 소요 시간·실패율은? | 성능·AI 의존성 |
| BQ-04 | Job/지역/기관이 공공 Reference에 얼마나 매핑되는가? | 데이터 품질 |
| BQ-05 | 외부 데이터 freshness·DQ pass rate는? | 수집 파이프라인 |
| BQ-06 | (Context) 지역·연령대 고용 지표는 어떤 수준인가? | 보고서·설명 보조 (개인 판정 금지) |

---

## 3. Core Product KPIs

| KPI | Formula / Grain | Dimensions | Source | Owner | Evidence |
| --- | --- | --- | --- | --- | --- |
| Assessment Volume | COUNT(assessment) / day | date, status, org | `analytics.v_kpi_assessment_volume` | PM/Ops | DESIGNED |
| Finalization Rate | FINALIZED / 전체 Assessment | date, org | `analytics.v_kpi_finalization_rate` | PM | DESIGNED |
| Risk Grade Mix | COUNT by risk_grade | date, job, org | `analytics.v_kpi_risk_grade_mix` | PM/Policy | DESIGNED |
| Compute Success Rate | AI_COMPLETED+FINALIZED / compute 시도 | date | `analytics.v_kpi_compute_success_rate` | BE | DESIGNED |
| Explain Fallback Rate | explain 실패 / score 성공 | date | event log | AI | PLANNED / NOT TESTED |
| p95 Compute Latency | p95(compute-risk duration) | date | event log/metrics | BE | PLANNED / NOT TESTED |

각 KPI는 formula, grain, segment, source, owner, action을 고정한다. 증거가 없으면 NOT TESTED.

---

## 4. External / Reference KPIs

| KPI | 정의 | View / Source | Evidence |
| --- | --- | --- | --- |
| Job Reference Coverage | 평가에 사용된 Job 중 공공 Job Reference 매핑 비율 | `analytics.v_kpi_job_reference_coverage` | DESIGNED |
| Organization Match Rate | 기관 입력 중 OrganizationMaster 매핑 성공 비율 | `analytics.v_kpi_organization_match_rate` | DESIGNED |
| Region Code Match Rate | 지역값 중 공식 지역코드 매핑 성공 비율 | `analytics.v_kpi_region_code_match_rate` | DESIGNED |
| External Data Freshness | source 기준일/수집일 대비 최신성 | `analytics.v_kpi_external_data_freshness` | DESIGNED |
| External DQ Pass Rate | DQ gate 통과 row 비율 | `analytics.v_kpi_external_dq_pass_rate` | DESIGNED |
| Context Coverage | 분석 대상 지역·기간 중 KOSIS Context 존재 비율 | `analytics.v_kpi_context_coverage` | DESIGNED |

상세 필드·파이프라인·provenance는 [`de/DE.md`](../de/DE.md) / `spring/db/external/` 과 동기화한다.

---

## 5. Analysis Grain

- 제품평가: `assessment_id` (개인 단위, 운영 분석)
- 일자리 Reference: `reference_period × region × program/job_type`
- 기관: `reference_period × region × organization_type`
- 고용통계: `reference_period × region × age_group × metric`

**금지:** KOSIS 집단 평균으로 개인 Applicant score/grade 변경 또는 개인 취업 가능성 추론.

Grain 검증: `spring/db/quality/analytics_checks.sql`

---

## 6. Data Model for Analytics

Star Schema (`spring/db/analytics/`):

- Fact: `analytics.fact_assessment` (assessment_id, assessed_at, status, risk_percent, risk_grade, org_id, job_id, …)
- Dim: `dim_date`, `dim_organization`, `dim_job`, `dim_applicant`, `dim_risk_grade`
- Reference mart (aggregate only): `external_ref.job_reference`, `organization_master`, `elderly_employment_snapshot`

운영 OLTP와 분석용 스키마는 분리한다. 물리 복제/전용 분석 DB는 **PLANNED**.

---

## 7. Event / Tracking (PLANNED)

필요 시:

- `assessment_created`, `compute_risk_started/succeeded/failed`, `explain_succeeded/failed`, `status_finalized`
- correlation: `assessment_id`, `request_id`
- GA4 Measurement Protocol 또는 내부 이벤트 테이블

Explain Fallback Rate·p95 Latency는 이 이벤트 계층이 있어야 IMPLEMENTED로 승격한다.

---

## 8. Analysis Principles

1. 상관 ≠ 인과. 인과 주장 시 설계·실험 근거 필요
2. 외부 통계는 cohort context·운영 품질 설명용
3. 개인 식별 가능 단위 공개 최소화
4. KPI 정의 변경 시 version과 영향 범위 기록 (`analytics.kpi_definition`)
5. 대시보드 수치와 DB/로그 근거 대사 가능해야 함

---

## 9. DA-01~04 매핑

| ID | 내용 | 산출물 |
| --- | --- | --- |
| DA-01 | Business Question & KPI Definition | 본 문서 §2–4, `kpi_definition` |
| DA-02 | Analysis Design & Grain | 본 문서 §5, `analytics_checks.sql` |
| DA-03 | Data / Event Architecture | `spring/db/analytics/*`, §6–7 |
| DA-04 | Governance (인과 과장 금지, privacy, version) | 본 문서 §8, analytics 품질 가드 |

---

## 10. Evidence 기준

| 상태 | 의미 |
| --- | --- |
| IMPLEMENTED | KPI 정의 + 실제 쿼리/대시보드 + 샘플 결과 + grain 검증 |
| DESIGNED | KPI 정의 + 재현 가능 SQL/뷰 (대시보드·샘플은 선택) |
| PLANNED | 설계만 문서화, 스키마/이벤트 미구현 |
| NOT TESTED | 정의·쿼리는 있으나 검증 결과 없음 |

현재 Core/External KPI 뷰는 **DESIGNED**. Event 기반 KPI는 **PLANNED / NOT TESTED**.

---

## 11. 공식 근거

- Power BI Star Schema
- GA4 Measurement Protocol
- 공공데이터·KOSIS 이용 조건

### 공식 데이터 카탈로그 (DE §3과 동기화)

**Reference (일자리·기관·지역)**

- 노인사회활동 시스템 코드: https://www.data.go.kr/data/15057083/openapi.do
- 자립형일자리 수행기관: https://www.data.go.kr/data/15056961/openapi.do
- 자립형일자리 사업모집공고: https://www.data.go.kr/data/15057200/openapi.do
- 노인 구인정보(Senuri): https://www.data.go.kr/data/15015153/openapi.do
- 노인일자리 통합정보: https://www.data.go.kr/data/15050148/fileData.do
- 보건복지부 시도별 사업현황: https://www.data.go.kr/data/15127867/fileData.do

**직무 위험 통계 (집단 대리변수 — 개인 label 금지)**

- KOSHA 산업재해 마이크로데이터: https://www.data.go.kr/data/15127634/fileData.do
- 연령별 사고재해자수: https://www.data.go.kr/data/15117909/fileData.do
- 산업중분류×발생형태 재해자수: https://www.data.go.kr/data/15064493/fileData.do
- 산업중분류 재해율: https://www.data.go.kr/data/15064270/fileData.do

**고용 Context**

- KOSIS OpenAPI: https://kosis.kr/serviceInfo/openAPIGuide.do

### 실행

```bash
cd spring
./db/apply-schema.sh
./db/pipeline/run_all.sh
PGPASSWORD=change-me psql -h localhost -U if_user -d if_spring -f db/quality/analytics_checks.sql

# KPI 샘플
PGPASSWORD=change-me psql -h localhost -U if_user -d if_spring \
  -c "SELECT * FROM analytics.v_kpi_finalization_rate ORDER BY full_date DESC LIMIT 14;"
```

## 기준 문서

- PRD_v0
- SRS_v0
- DE — Data Engineering Specification ([`de/DE.md`](../de/DE.md), `spring/db/external/`, `ai/src/etl/02_external_public_ingestion.py`)

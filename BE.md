# BE — Backend Specification

<aside>

**프로젝트:** IF · **분류:** BE · **상태:** PRD/SRS/SDD 설계 기준 통합본

규칙+통계 기반 점수와 Gemini 설명의 분리. 구현·성능 증거가 없는 항목은 DESIGNED / PLANNED / NOT TESTED로 표시한다.

</aside>

## 1. Backend Scope

IF Backend는 노인일자리 운영 담당자가 신청자·건강·직무를 입력하면 AI 위험도 %를 산출하고 판단 기록을 남기는 **orchestration + persistence** 계층이다.

핵심 흐름:

```
Applicant/Health/Job 입력 → Assessment(PENDING_AI)
  → AIClient.score + explain → AIRiskResult
  → AI_COMPLETED → 담당자 FINALIZED
```

담당 범위:

- API contract (OpenAPI)
- Domain / Entity / Transaction
- AI 서비스 연동 (score/explain 분리)
- 상태전이·비즈니스 규칙 강제
- 보안(MVP Mock → v1.0 JWT)
- 오류 처리·성능·DB
- 테스트·배포 연동

Out of Scope (MVP): 실인증 SSO, ML 모델 서빙, 직무 매칭 추천 API, AuditLog API 연동.

---

## 2. Requirements → Backend Mapping

| SRS | Backend 책임 | 주요 컴포넌트 | Evidence |
| --- | --- | --- | --- |
| FR-001~003 | 신청자·건강·평가 생성 | ApplicantService, AssessmentService | IMPLEMENTED |
| FR-004~007 | 위험도 산출·설명·상세조회 | AIRiskService, AIClient | IMPLEMENTED |
| FR-008~010 | 상태 전이·목록·삭제 | AssessmentService | IMPLEMENTED |
| NFR-001 | compute-risk P95 ≤ 3초 | RestTemplate 3s timeout | DESIGNED (timeout 설정 IMPLEMENTED, P95 측정 NOT TESTED) |
| NFR-002~003 | 점수 불변, 개인정보 마스킹 | explain 분리, AI guardrails | DESIGNED |
| BR-004~006 | 등급·상태전이 규칙 | `gradeOf(percent)` POL-002, `ALLOWED_TRANSITIONS` | IMPLEMENTED |

---

## 3. API / Contract

| API | Method | Endpoint | 핸들러 | Evidence |
| --- | --- | --- | --- | --- |
| API-001 | POST | `/api/applicants` | `ApplicantController.createApplicant` | IMPLEMENTED |
| API-002 | POST | `/api/applicants/{id}/health-snapshots` | `ApplicantController.createHealthSnapshot` | IMPLEMENTED |
| API-003 | POST | `/api/applicants/{id}/assessments` | `AssessmentController.createAssessment` | IMPLEMENTED |
| API-004 | GET | `/api/jobs` | `JobController.listJobs` | IMPLEMENTED |
| API-005 | POST | `/api/assessments/{id}/compute-risk` | `AssessmentRecordController.computeRisk` | IMPLEMENTED |
| API-006 | GET | `/api/assessments/{id}/risk-detail` | `AssessmentRecordController.getRiskDetail` | IMPLEMENTED |
| API-007 | PATCH | `/api/assessments/{id}` | `AssessmentRecordController.updateRecord` | IMPLEMENTED |
| API-008 | GET | `/api/assessments` | `AssessmentRecordController.listAll` | IMPLEMENTED |
| API-009 | DELETE | `/api/assessments/{id}` | `AssessmentRecordController.deleteRecord` | IMPLEMENTED |

계약 규칙:

- **에러 응답:** `ApiResponse` + `errorCode` (IMPLEMENTED)
- **성공 응답 `ApiResponse` 래핑:** DESIGNED (현재 성공 바디는 DTO/`Page` 직접 반환 — FE 호환)
- 오류 코드: `INVALID_REQUEST`, `INVALID_STATUS_TRANSITION`, `NOT_FOUND`, `AI_SERVICE_UNAVAILABLE`, `AI_SERVICE_TIMEOUT`, `INTERNAL_ERROR`
- AI 내부 contract(`/score`, `/explain`) 변경 시 Spring contract test — DESIGNED

정적 스펙: [`spring/src/main/resources/openapi.yml`](spring/src/main/resources/openapi.yml)

---

## 4. Domain / Data

주요 Entity: Applicant, HealthSnapshot, Job, Assessment, AssessmentStatus, AIRiskResult, AdminUser

상태 머신 (`AssessmentStatus.ALLOWED_TRANSITIONS`):

```
PENDING_AI → AI_COMPLETED   (compute-risk score 성공 시에만)
AI_COMPLETED → FINALIZED    (담당자 PATCH)
그 외 전이 → 400 INVALID_STATUS_TRANSITION
```

idempotency (SRS Q-001): compute-risk 재실행 시 **기존 AIRiskResult 덮어쓰기**.

---

## 5. Transaction & Orchestration

- FastAPI 호출은 DB 트랜잭션 밖에서 수행하고, 성공 결과만 로컬 트랜잭션으로 영속화한다.
- explain 실패 시 score 결과만 저장하고 `AI_COMPLETED`로 전이 (fallback).
- score 실패 시 결과 미저장, `PENDING_AI` 유지, 502/504 반환.
- 삭제 시 AIRiskResult 연쇄 제거.

---

## 6. Resilience

| 항목 | 상태 |
| --- | --- |
| AIClient timeout 3s | IMPLEMENTED |
| timeout → 504 / unavailable → 502 | IMPLEMENTED |
| circuit breaker | PLANNED |
| compute-risk 덮어쓰기 | IMPLEMENTED |

---

## 7. Security

| 항목 | MVP | v1.0 |
| --- | --- | --- |
| 인증 | Mock (첫 AdminUser 임시 배정) | Session/JWT — PLANNED |
| 인가 | 없음 | Role — PLANNED |
| 개인정보 | explain 전 마스킹 (AI 측) | 동일 + 감사 — DESIGNED |
| Secret | 환경변수 | Secret store — PLANNED |
| AuditLog | Entity만 (미사용) | API 연동 — PLANNED |
| BOLA | — | 소유권 검증 — PLANNED |

---

## 8. Error Handling

| HTTP | errorCode |
| --- | --- |
| 400 | INVALID_REQUEST / INVALID_STATUS_TRANSITION |
| 404 | NOT_FOUND |
| 502 | AI_SERVICE_UNAVAILABLE |
| 504 | AI_SERVICE_TIMEOUT |
| 500 | INTERNAL_ERROR (스택 미노출) |

---

## 9. Performance / DB

- 목록: pagination + `assessedAt DESC, id DESC` stable sort — IMPLEMENTED
- N+1 방지: DTO projection + query count 테스트 — IMPLEMENTED
- Index / EXPLAIN: [`BACKEND_STRUCTURE.md`](spring/BACKEND_STRUCTURE.md), [`spring/db/`](spring/db/) — IMPLEMENTED (인덱스), 측정 증거는 문서 기준

---

## 10. Package Structure (as-built)

```
applicant / job / assessment / ai / admin / global
```

---

## 11. Test / Deployment

| 항목 | Evidence |
| --- | --- |
| Unit: gradeOf, 상태전이 | IMPLEMENTED |
| Integration: 예외 매핑 | IMPLEMENTED |
| Query count (N+1) | IMPLEMENTED |
| OpenAPI 전면 contract | DESIGNED |
| E2E compute → FINALIZED | NOT TESTED |
| 배포 smoke | PLANNED |

---

## 12. Evidence 기준

다음이 있을 때만 `IMPLEMENTED`: 코드 + 테스트 통과 증거 / query count·EXPLAIN / contract / 상태전이·점수 불변 integration.

그 외: DESIGNED / PLANNED / NOT TESTED.

---

## 13. 공식 근거

Spring Boot, Spring Transaction, Spring Data JPA, OpenAPI, OWASP ASVS, OWASP API Security Top 10, PostgreSQL

## 기준 문서

- PRD_v0 / SRS_v0 / SDD_v0
- [`spring/BACKEND_STRUCTURE.md`](spring/BACKEND_STRUCTURE.md)
- DA.md / DE (`spring/db/external/`)

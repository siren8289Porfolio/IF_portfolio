# QA — Quality Assurance / QC Specification

<aside>

**프로젝트:** IF · **분류:** QA/QC · **상태:** PRD/SRS/SDD 추적 기반 품질 통합본

품질의 최우선 기준은 UI 정상 동작보다 **점수 불변식·상태전이 무결성·개인정보 마스킹·transaction atomicity**이다.

실제 실행·평가 증거가 없는 항목은 NOT TESTED이며 PASS로 처리하지 않는다.

</aside>

## 1. Quality Objective

PRD/SRS의 3대 기능(F-001 신청자 상태 입력, F-002 AI 위험도 산출, F-003 판단 기록 관리)을 검증 가능한 acceptance criteria로 연결한다.

핵심 품질 목표:

| 목표 | Evidence |
| --- | --- |
| score/grade 정확성 · POL-002 등급 경계 | IMPLEMENTED (`gradeOf` ≤40 LOW / ≤60 MID / 61+ HIGH) |
| LLM이 authoritative score·grade 변경 금지 | IMPLEMENTED ([`AI.md`](AI.md) invariant tests) |
| 상태전이 `PENDING_AI → AI_COMPLETED → FINALIZED`만 | IMPLEMENTED |
| 건강 스냅샷: 평가 시점 `health_id` 고정 | DESIGNED (동일 row 사후 수정 시 불변 테스트 NOT TESTED) |
| score 장애 → 미저장·PENDING_AI / explain 장애 → 점수 fallback | IMPLEMENTED (BE) |
| 개인정보 LLM 전송 전 마스킹 | IMPLEMENTED (guardrails unit) |
| 기여 요인 ≥ 1 (score top_factors) | IMPLEMENTED (scoring fallback factor) |
| AIRiskContribution 테이블 연쇄 | N/A (엔티티 미사용·삭제됨) |
| transaction / API contract / 권한 | PARTIAL (계약·전이 IMPLEMENTED; JWT PLANNED) |

---

## 2. Traceability (RTM)

최소 연결: `PRD → SRS → SDD/API → TC → Evidence`

| PRD | SRS | SDD / API | TC / Evidence |
| --- | --- | --- | --- |
| F-001 | FR-001~003 | Applicant/Assessment API | IF-TC-01~02 · create → PENDING_AI |
| F-002 | FR-004~007, NFR-001~005 | compute-risk, risk-detail | IF-TC-03~06 · GradeOf / AI invariant |
| F-003 | FR-008~010 | PATCH/DELETE assessment | IF-TC-07,10 · StatusTransitionTest |
| POL-001~003 | BR-004~006, NFR-002 | `gradeOf`, explain isolation | IF-TC-03,04 · `QaRegressionGateTest` |
| NFR-003 | NFR-003 | guardrails 마스킹 | IF-TC-08 · `test_ai_invariants` |

상세 TC 본문: If — Test / QAQC 문서_v0 (외부). 본 저장소는 자동화 가능한 gate를 코드로 고정한다.

---

## 3. Static Review (QA-03) Checklist

PR / 구현 전:

- [x] 등급 산정 POL-002 / BR-004와 코드 일치 (`gradeOf(double)`)
- [x] LLM이 score write 경로 비접근 (adapter 분리)
- [x] 상태전이 검증 코드 반영
- [x] OpenAPI ↔ Controller (BE; 전면 contract DESIGNED)
- [ ] 건강 스냅샷 값 복사 불변 (row 공유 시 취약) — NOT TESTED
- [x] 마스킹이 explain 전 적용
- [x] AI 호출이 긴 DB TX 밖 (TransactionTemplate)

---

## 4–7. Test Design Summary

자동화 위치:

| 영역 | 위치 | Status |
| --- | --- | --- |
| gradeOf 경계 | `QaRegressionGateTest`, `GradeOfTest` | IMPLEMENTED |
| 상태전이 | `AssessmentStatusTransitionTest` | IMPLEMENTED |
| 예외 코드 | `GlobalExceptionHandlerTest` | IMPLEMENTED |
| N+1 query count | `AssessmentServiceQueryCountTest` | IMPLEMENTED |
| Explain invariant / 마스킹 | `ai/tests/test_ai_invariants.py` | IMPLEMENTED |
| Baseline band (ML) | `ai/tests/test_ml_baseline.py` | IMPLEMENTED |
| compute-risk P95 ≤ 3s | — | **NOT TESTED** |
| E2E ≤ 3분 | — | **NOT TESTED** |
| 401/403 | — | PLANNED (v1.0) |

### POL-002 Grade boundaries (authoritative storage)

```
risk_percent <= 40 → LOW
41 <= risk_percent <= 60 → MID
risk_percent >= 61 → HIGH
```

FastAPI `risk_band`(낮음/보통/…)는 설명용 4구간이며, **DB `risk_grade`는 위 POL-002**를 따른다.

---

## 8. Regression Gate (매 배포)

고정 fixture (코드로 강제):

1. `gradeOf(40)=LOW`, `gradeOf(41)=MID`, `gradeOf(61)=HIGH`
2. AI 호출 전후 score/grade 불변 (AI tests)
3. 잘못된 상태전이 거부
4. INTERNAL_ERROR 메시지에 stack/secret 미노출
5. (수동/향후) 스냅샷 고정 · rollback partial row=0 — NOT TESTED

실행:

```bash
cd spring && ./gradlew test
cd ai && PYTHONPATH=. python3 -m unittest discover -s tests
```

---

## 9. Defect / Severity

Release-blocking: 점수 변경, 상태전이 깨짐, 개인정보 유출, partial commit, 핵심 API 장애.

Critical / Major / Minor / Trivial — 기록 필드: requirement id, TC, severity, env, repro, evidence, root cause, fix version, retest.

---

## 10. Release Gate (QA-07)

| Gate | Status |
| --- | --- |
| P0/P1 정합성·보안 open defect 0 | process (수동) |
| 고정 regression (`./gradlew test` + AI unittest) | IMPLEMENTED |
| Contract / migration | PARTIAL |
| 성능 NFR | **NOT TESTED** (명시) |
| 마스킹 unit | IMPLEMENTED |

**NO-GO:** P0 open, contract mismatch, rollback 미검증, 개인정보·데이터 품질 위험, 점수 불변식 실패.

---

## 11. QA-01~07 매핑

| ID | 내용 | 본 문서 |
| --- | --- | --- |
| QA-01 | Quality Strategy | §1 |
| QA-02 | Traceability | §2 |
| QA-03 | Review | §3 |
| QA-04 | Test Plan | §4–7 |
| QA-05 | Execution | automated tests + Test/QAQC_v0 |
| QA-06 | Defect / Regression | §8–9 |
| QA-07 | Release Gate | §10 |

---

## 12. 공식 근거

ISO/IEC/IEEE 29119 · IEEE 730 · ISTQB · OWASP WSTG/ASVS · Spring Boot Testing · PostgreSQL Constraints

## 기준 문서

PRD_v0 · SRS_v0 · SDD_v0 · If — Test/QAQC_v0 · [`BE.md`](BE.md) · [`AI.md`](AI.md) · [`ML.md`](ML.md)

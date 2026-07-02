## IF Spring Backend 구조·유지보수 기준

이 문서는 고령자 노동·돌봄 규제 판단 웹앱의 **Spring + PostgreSQL 백엔드** 구조를 정리한 것이다.
핵심 목표는 **기능(도메인) 단위로 코드를 묶어서**, 기능 추가·변경 시 영향 범위를 쉽게 파악하는 것이다.

MVP 스코프는 3대 기능으로 고정되어 있다: (1) 신청자·건강정보 입력, (2) AI 위험도 분석(FastAPI 연동), (3) 대시보드 기록 관리.

---

### 1. 실제 패키지 구조 (기능 단위)

`domain.human` / `domain.ai` 같은 상위 분리는 사용하지 않는다. 대신 **기능(도메인) 이름으로 최상위 패키지를 만들고**,
그 아래에 `entity / repository / service / controller / dto`를 둔다.

```
com.example.demo
├── applicant/    (신청자·건강 스냅샷)   entity, repository, service, controller, dto
├── job/          (직무)                entity, repository, service, controller, dto
├── assessment/   (평가 기록)           entity, repository, service, controller, dto
├── ai/           (AI 위험도 결과·연동)  entity, repository, service, client, health, dto
├── admin/        (관리자 계정)         entity, repository
└── global/       (공통)               config, exception, response
```

레이어 간 의존성 방향은 동일하게 유지한다:

`controller → service → repository → entity`

---

### 2. 현재 엔티티 목록

| 패키지 | 엔티티 | 비고 |
|---|---|---|
| `admin.entity` | `AdminUser` | 관리자 계정 (현재 실제 로그인 연동 없음, assessment 생성 시 첫 번째 계정 자동 배정) |
| `applicant.entity` | `Applicant`, `HealthSnapshot` | 신청자 기본정보 + 건강 스냅샷 |
| `job.entity` | `Job` | 검토 대상 직무 |
| `assessment.entity` | `Assessment`, `AssessmentStatus` | 평가 기록 (PENDING_AI/AI_COMPLETED/FINALIZED) |
| `ai.entity` | `AIRiskResult` | FastAPI `/score` + `/explain` 결과 저장 (점수, 등급, 설명 JSON) |

> MVP 3대 기능 범위 밖이라 정리된 엔티티: `JobMatch`, `SelectionLog`, `AuditLog` (기능 자체 삭제),
> `AIJobRiskProfile`, `AIRiskContribution` (설계만 있고 어떤 서비스/컨트롤러에서도 사용되지 않아 삭제).
> 필요 시 실제 요구사항이 생겼을 때 재도입한다.

---

### 3. 엔티티 설계 규칙

- 모든 엔티티는 **ERD 테이블 이름을 그대로 `@Table(name = "...")` 로 사용**한다.
- 기본 키는 `bigint` → `Long` + `@GeneratedValue(strategy = IDENTITY)` 를 기본으로 사용한다.
- 연관관계는 실무 쿼리 기준으로 최소한만 잡는다.
  - 예: `Assessment` 는 `Applicant`, `Job`, `HealthSnapshot`, `AdminUser`, `AIRiskResult` 를 참조.
- 자주 필터/정렬하는 컬럼은 `@Table(indexes = {...})`로 인덱스를 명시한다.
  - 예: `Assessment.assessed_at`(정렬), `Assessment.status`(필터), `(applicant_id, assessed_at)`(복합).
- 시간 필드는 일관되게 `OffsetDateTime` 사용 (`created_at`, `assessed_at`, `generated_at` 등).
- boolean 컬럼(`*_flag`) 은 `Boolean` 으로 매핑한다.

---

### 4. 리포지토리 규칙

- 리포지토리는 해당 기능 패키지의 `repository` 하위에 둔다. 예: `assessment.repository.AssessmentRepository`.
- 인터페이스 이름은 **엔티티 + Repository** (`AssessmentRepository`).
- 기본은 `JpaRepository<Entity, Long>` 만 상속하고, 커스텀 쿼리가 필요하면 메서드 이름 규칙으로 우선 해결한다.
- 목록 조회에서 연관 엔티티를 여러 번 지연 로딩하게 되면(N+1) `@EntityGraph`/`JOIN FETCH` 또는 JPQL 생성자
  표현식(`select new ...DTO(...)`)으로 한 번에 가져온다.
  - 예: `AssessmentRepository.findAllRecords(Pageable)` — `Assessment`+`applicant`+`job`+`healthSnapshot`+
    `aiRiskResult`를 join 1번으로 묶되, entity 전체가 아니라 `AssessmentRecordResponse`(대시보드에 필요한 9개
    컬럼)만 직접 projection한다. entity 전체를 fetch join하면 `description`/`work_hours`/`explanation_json`처럼
    화면에 안 쓰는 컬럼까지 읽고 영속성 컨텍스트에 올라가므로, **읽기 전용 목록**은 projection을 기본으로 한다.
  - 집계(카운트)는 목록 페이지 length로 계산하지 않는다. 페이지 크기(예: 20~100)를 넘는 순간 값이 틀어지기
    때문에, `count()`/`countByStatus(...)`처럼 별도 COUNT 쿼리로 서버에서 계산해 전용 엔드포인트로 내려준다.
    - 예: `GET /api/assessments/summary` — `AssessmentService.getSummary()`.
- 목록 API는 기본적으로 `Pageable`을 받아 `Page<T>`로 반환한다 (전체 `List` 반환 지양).

---

### 5. controller / service / dto 구조

기능 패키지 하위에 그대로 둔다 (상위 `controller.*` / `service.*` 패키지로 다시 묶지 않는다).

- `assessment.controller.AssessmentController` — HTTP 엔드포인트. DTO ↔ 엔티티 변환은 서비스에 위임.
- `assessment.service.AssessmentService` — 트랜잭션 경계(`@Transactional`), 비즈니스 규칙.
- `assessment.dto.AssessmentResponse` / `AssessmentRecordResponse` 등 — 프론트와의 계약 모델.

읽기 전용 조회 메서드에는 `@Transactional(readOnly = true)`를 붙인다 (지연 로딩 시 `LazyInitializationException` 방지, `open-in-view: false`와 함께 사용).

---

### 6. 데이터베이스 / JPA 설정

- `application.yml` 에서 Postgres + Hibernate 설정을 관리한다.
- 로컬 개발 기본값:
  - DB 이름: `if_spring` / 계정: `if_user`
  - JPA: `ddl-auto: update` (아직 Flyway 등 마이그레이션 도구 미도입 — 다음 개선 항목)
- Lazy 로딩 기본 (`fetch = LAZY`) 으로 두고, 조회 API 에서는 **service 계층에서 필요한 연관만 fetch join** 하거나
  `@EntityGraph`/DTO projection 을 사용한다.
- `spring-boot-starter-actuator`로 `/actuator/health` 노출. `AiServiceHealthIndicator`가 FastAPI AI 서비스
  (`GET /health`) 연결 상태까지 `components.aiService`로 함께 보여준다.

#### 6-1. 로컬 DB 최초 생성 (한 번만)

DB는 **`spring/db/`** 가 단일 소스다. Hibernate는 `ddl-auto: validate`만 수행한다.

```
spring/db/
├── operational/     운영 DB (정규화 6테이블 + pipeline_run_log)
├── analytics/       Star Schema (dim_* + fact_assessment)
├── quality/         데이터 품질 SQL 테스트
├── pipeline/        증분 적재 → 검사 → MV 갱신
├── init-db.sh       Postgres 계정·DB 생성
└── apply-schema.sh  SQL 일괄 적용
```

```bash
cd spring
chmod +x db/*.sh db/pipeline/*.sh
./db/init-db.sh                    # DB 생성 + 스키마 + 시드
./gradlew bootRun

# 스키마만 재적용
./db/apply-schema.sh

# 파이프라인 1 run (증분 fact + 품질 + MV)
./db/pipeline/run_all.sh

# EXPLAIN 검증
PGPASSWORD=change-me psql -h localhost -U if_user -d if_spring -f db/verify-db-efficiency.sql
```

`docker compose up --build`로 띄우면 `postgres` 서비스가 위 과정을 컨테이너 안에서 대신 해준다
(`docker-compose.yml` 참고, 로컬에 Postgres를 직접 설치하지 않아도 됨).

#### 6-2. 실제 인덱스 효과 확인 (2만 건 기준 실측)

`EXPLAIN (ANALYZE, BUFFERS)`로 직접 검증한 결과:

| 쿼리 | 인덱스 없음 | 인덱스 있음 |
|---|---|---|
| `ORDER BY assessed_at DESC LIMIT 50` | Seq Scan + Sort, **11.4ms** | `idx_assessment_assessed_at` Index Scan Backward, **0.44ms** |
| `WHERE applicant_id = ?` | — | `idx_assessment_applicant_assessed_at` Index Scan, **0.008ms** |
| `WHERE risk_grade = 'HIGH'` (집계) | — | `idx_ai_risk_result_high` (partial index) Index Scan |

- `idx_ai_risk_result_high`는 `schema.sql`에서 `CREATE INDEX ... WHERE risk_grade = 'HIGH'`로 만든 **부분 인덱스**다.
  `risk_grade`는 LOW/MID/HIGH 3종류뿐이고 대시보드 요약 카드는 항상 HIGH 건수만 세므로, 전체 컬럼 인덱스보다
  작고 유지 비용이 싸다. JPA `@Index`는 `WHERE`절을 지원하지 않아 `schema.sql` + `defer-datasource-initialization`
  조합으로 Hibernate DDL 이후에 실행되도록 했다.
- 실제 실행된 SQL 문 수는 `logging.level.org.hibernate.SQL=DEBUG`로 확인 가능. 대시보드 목록 조회는 페이지
  크기와 무관하게 **join 쿼리 1개 + count 쿼리 1개, 총 2개**만 실행된다 (N+1 아님).

---

### 7. 유지보수 팁

- 새 기능 추가 시 체크리스트:
  1. 기존 기능 패키지에 속하는가, 새 기능 패키지가 필요한가?
  2. 엔티티가 필요한가? → 해당 패키지의 `entity`에 추가하고 실제 조회 패턴에 맞는 인덱스를 같이 고려한다.
  3. 목록/집계 API라면 페이지네이션 + N+1 방지(fetch join/EntityGraph)를 기본으로 설계한다.
  4. 실제로 어떤 서비스/컨트롤러도 사용하지 않는 엔티티·리포지토리·서비스는 만들어두지 않는다 (설계만 하고 방치 금지).
- 코드가 실제 문서와 어긋나기 시작하면 이 문서를 바로 갱신한다 (문서가 실제 구조보다 앞서가지 않도록 주의).

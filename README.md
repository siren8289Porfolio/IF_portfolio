# IF 

## 1. 핵심 한 줄

> **IF는 대시보드 목록 조회의 N+1 가능성을 DTO Projection으로 차단하고, PostgreSQL 인덱스·Materialized View·Star Schema·증분 적재 구조를 추가해 조회 성능과 데이터 분석 확장성을 함께 개선한 프로젝트입니다.**

---

## 2. 효율화 배경

IF는 지원자 평가, AI 위험도 분석, 대시보드 조회를 다루는 Spring Boot 기반 프로젝트입니다.

대시보드 목록은 여러 연관 데이터를 함께 보여줘야 하기 때문에, Entity 중심으로 조회하면 연관 객체 접근 시 추가 쿼리가 늘어나는 N+1 문제가 생길 수 있습니다. 또한 평가 데이터가 많아질수록 최신순 목록, 상태별 조회, 고위험 평가 조회, 대시보드 집계의 성능이 중요해집니다.

그래서 IF는 효율화를 두 방향으로 나눠 적용했습니다.

```text id="xoh8g7"
1. 코드 효율화
   → DTO Projection으로 대시보드 목록 조회 SQL 수 고정
   → readOnly 트랜잭션과 open-in-view 비활성화
   → Hibernate Statistics로 N+1 회귀 테스트

2. DB 효율화
   → PostgreSQL 인덱스 / 복합 인덱스 / Partial Index
   → Materialized View 기반 대시보드 집계
   → Star Schema 기반 분석 구조
   → updated_at 기준 증분 적재
   → 품질 검사 SQL과 파이프라인 구성
```

비전공자식으로 말하면,
기존에는 대시보드 목록을 만들 때 **서류를 한 장씩 추가로 꺼내보는 구조가 될 수 있었고**, 분석할 때도 운영 테이블을 그대로 뒤져야 했습니다.
개선 후에는 **목록 화면에 필요한 요약 정보만 한 번에 가져오고, 분석용 장부는 따로 정리해두는 구조**로 바꾼 것입니다.

---

# Part 1. 코드 효율화

## 3. 코드 효율화 요약

| 항목             | 내용                                                                       | 주요 파일                                                 |
| -------------- | ------------------------------------------------------------------------ | ----------------------------------------------------- |
| N+1 방지         | Entity fetch join 대신 JPQL 생성자 projection 사용                              | `AssessmentRepository.java`                           |
| 서비스 계층 적용      | `listAllRecords()`에서 projection 사용, `@Transactional(readOnly = true)` 적용 | `AssessmentService.java`                              |
| 집계 쿼리 분리       | 프론트 length/filter 대신 서버 COUNT 3번으로 집계                                    | `AssessmentService.java`, `AssessmentRepository.java` |
| open-in-view 끔 | 요청 전체에 영속성 컨텍스트를 붙잡지 않도록 설정                                              | `application.yml`                                     |
| 엔티티 인덱스 선언     | JPA `@Index`로 자주 쓰는 컬럼 명시                                                | `Assessment.java`                                     |
| 읽기 전용 트랜잭션     | AI 조회 등 조회성 로직에 readOnly 적용                                              | `AIRiskService.java`                                  |
| 예외 로깅          | catch-all 예외에서 스택트레이스 로그 추가                                              | `GlobalExceptionHandler.java`                         |
| N+1 회귀 테스트     | 5건 목록 조회도 SQL 2개 이하로 고정                                                  | `AssessmentServiceQueryCountTest.java`                |
| 테스트 프로파일       | H2 + Hibernate statistics 설정                                             | `application-test.yml`                                |
| 설계 문서          | N+1, 인덱스, 페이지네이션 가이드                                                     | `BACKEND_STRUCTURE.md`                                |

---

## 4. DTO Projection으로 N+1 가능성 줄이기

### 기존 문제

기존 Entity 중심 조회는 연관 객체를 건드릴 때 추가 쿼리가 발생할 수 있습니다.

```text id="mej4p9"
Before

Assessment Entity 목록 조회
→ applicant 접근
→ job 접근
→ aiRiskResult 접근
→ 각 행마다 추가 쿼리 발생 가능
```

비전공자식으로 말하면,
대시보드 목록을 만들기 위해 기본 명단을 가져온 뒤, 각 지원자의 정보와 직무 정보, AI 결과를 **한 명씩 다시 물어보는 구조**가 될 수 있습니다.

---

### 개선 후

IF에서는 대시보드 목록에 필요한 컬럼만 JPQL 생성자 projection으로 바로 DTO에 담아 가져오도록 바꿨습니다.

Spring Data JPA 공식문서는 JPQL에서 root object, individual properties, DTO object를 constructor expression으로 선택할 수 있다고 설명합니다. 즉, 화면에 필요한 데이터만 DTO로 조회하는 방식은 Spring Data JPA에서 공식적으로 지원되는 패턴입니다.

```text id="t1q8ek"
After

대시보드에 필요한 컬럼만 DTO Projection으로 조회
→ join 1번 + count 1번
→ 목록 조회 SQL 수 고정
```

### 효과

```text id="bd2wky"
1. Entity 전체 조회 방지
2. 연관 객체 lazy loading 가능성 감소
3. 대시보드 목록 SQL 수 고정
4. 목록 응답에 필요한 필드만 명확히 조회
```

쉽게 말하면,
지원자별 모든 서류철을 다 꺼내는 게 아니라 **대시보드에 필요한 이름, 직무, 상태, 위험도만 적힌 요약표를 바로 가져오는 것**입니다.

---

## 5. `@Transactional(readOnly = true)` 적용

조회 전용 서비스에는 `@Transactional(readOnly = true)`를 적용했습니다.

Spring 공식문서에서 `@Transactional`은 클래스나 메서드에 트랜잭션 의미를 부여하는 메타데이터라고 설명합니다. 또한 `readOnly`는 트랜잭션이 사실상 읽기 전용임을 나타내며, 런타임 최적화에 활용될 수 있는 flag입니다.

```text id="9us8dl"
쓰기 작업:
데이터 생성/수정 가능

읽기 작업:
데이터 변경 없이 조회만 수행
→ readOnly 트랜잭션으로 의도를 명확히 표현
```

비전공자식으로 말하면,
문서를 수정하는 업무와 문서를 읽기만 하는 업무를 구분해서, **조회 로직이 데이터를 바꾸지 않는다는 의도를 코드에 표시한 것**입니다.

---

## 6. `spring.jpa.open-in-view=false`

IF는 `open-in-view`를 껐습니다.

Spring Boot 공식문서는 Open EntityManager in View 패턴이 web view 단계의 lazy loading을 허용한다고 설명하며, 이 동작을 원하지 않으면 `spring.jpa.open-in-view=false`로 설정하라고 안내합니다.

```text id="942a5q"
open-in-view=true:
요청이 끝날 때까지 DB 세션을 오래 붙잡음
→ Controller/View 단계에서도 lazy loading 가능

open-in-view=false:
Service 트랜잭션 안에서 필요한 데이터를 다 가져오게 강제
→ 숨은 lazy loading을 줄임
→ 조회 책임이 Service 안으로 들어옴
```

비전공자식으로 말하면,
화면을 그리다가 중간에 몰래 창고에 다시 다녀오지 못하게 하고, **서비스 단계에서 필요한 자료를 미리 챙기게 만든 구조**입니다.

---

## 7. JPA `@Index` 선언

Entity에 `@Index`를 선언해 자주 조회되는 컬럼을 명시했습니다.

다만 운영 DB에서는 Entity annotation만 믿기보다 실제 운영 스키마 반영용 SQL을 별도로 관리하는 것이 더 안전합니다. 그래서 IF는 `db/operational/02_indexes.sql`에 운영 인덱스 SQL을 분리해두었습니다.

```text id="7u1z2r"
Entity @Index:
개발자가 자주 쓰는 조회 조건을 코드에서 파악하기 쉬움

운영 SQL:
실제 운영 DB에 명시적으로 반영하는 기준
```

비전공자식으로 말하면,
코드에는 “이 항목은 자주 찾는다”는 표시를 남기고, 운영 DB에는 실제 책갈피를 꽂는 SQL을 따로 관리한 것입니다.

---

## 8. Hibernate Statistics 기반 회귀 테스트

N+1은 화면이 정상 출력되어도 숨어 있을 수 있습니다.
그래서 IF는 Hibernate Statistics로 실제 SQL 실행 횟수를 측정하는 테스트를 추가했습니다.

Hibernate Statistics는 SessionFactory에 속한 세션들의 통계를 노출하며, 쿼리 실행 횟수 같은 정보를 확인하는 데 사용할 수 있습니다.

```text id="z5bk2m"
테스트 기준

Assessment 5건 생성
→ listAllRecords() 실행
→ SQL 수가 2개 이하인지 확인
```

이 테스트 덕분에 나중에 누군가 다시 Entity 조회 + lazy loading 구조로 되돌려도, 쿼리 수가 증가하면서 테스트가 실패합니다.

비전공자식으로 말하면,
“화면은 잘 나오는데 뒤에서 DB를 너무 많이 부르는 문제”를 **자동 검사로 잡아내는 장치**를 만든 것입니다.

---

## 9. 코드 효율화 측정 결과

| 지표                    | Before          | After | 설명                    |
| --------------------- | --------------- | ----- | --------------------- |
| 대시보드 목록 SQL 수, 5건 기준  | N+1 시 21개 이상 가능 | 2개    | projection + count    |
| 대시보드 목록 SQL 수, 50건 기준 | 201개 이상 가능      | 2개    | 데이터 건수와 무관하게 SQL 수 고정 |

문서용으로는 이렇게 쓰면 됩니다.

> 대시보드 목록 조회를 Entity 중심 조회에서 DTO Projection 기반 조회로 변경해, 데이터 건수에 따라 증가할 수 있던 SQL 수를 고정했습니다. Hibernate Statistics 기반 테스트로 Assessment 5건 기준 `listAllRecords()` 실행 시 SQL 수가 2개 이하인지 검증해, 향후 N+1 회귀를 테스트 단계에서 감지할 수 있게 했습니다.

---

# Part 2. DB 효율화

## 10. DB 효율화 요약

| 항목                   | 내용                                                           | 주요 파일                               |
| -------------------- | ------------------------------------------------------------ | ----------------------------------- |
| B-tree / 복합 인덱스      | `assessed_at`, `status`, `(applicant_id, assessed_at)` 등 12개 | `db/operational/02_indexes.sql`     |
| Partial Index        | `risk_grade = 'HIGH'`만 인덱싱                                   | `db/operational/02_indexes.sql`     |
| Materialized View    | 대시보드 집계 MV 구성                                                | `db/operational/04_summary.sql`     |
| Star Schema          | `dim_date`, `dim_job`, `dim_applicant`, `fact_assessment`    | `db/analytics/01_star_schema.sql`   |
| 증분 적재                | `updated_at` 기준 UPSERT                                       | `db/analytics/02_refresh_fact.sql`  |
| CHECK / FK / Trigger | 데이터 무결성 강화                                                   | `db/operational/03_constraints.sql` |
| 품질 검사 SQL            | PK, FK, 허용값 검증                                               | `db/quality/checks.sql`             |
| 파이프라인                | 적재 → 검사 → MV 갱신                                              | `db/pipeline/run_all.sh`            |
| EXPLAIN 검증           | 인덱스 효과 확인                                                    | `db/verify-db-efficiency.sql`       |
| 로드맵 문서               | DB 효율화 적용 현황                                                 | `db/README.md`                      |

---

## 11. EXPLAIN ANALYZE로 실행계획 확인

DB 효율화는 “느낌상 빨라졌다”로 끝내면 안 됩니다.
IF에서는 `verify-db-efficiency.sql`로 인덱스 적용 전후의 `EXPLAIN ANALYZE`를 비교했습니다.

PostgreSQL 공식문서는 `EXPLAIN`을 사용하면 planner가 어떤 실행 계획을 만드는지 볼 수 있고, `ANALYZE` 옵션을 붙이면 실제 실행 시간과 실제 row count까지 확인할 수 있다고 설명합니다.

```text id="q8o1gg"
느낌으로 빠르다 판단하지 않음
→ EXPLAIN ANALYZE로 실제 실행 시간과 실행계획 확인
→ Seq Scan + Sort가 Index Scan으로 바뀌는지 검증
```

비전공자식으로 말하면,
“빨라진 것 같아요”가 아니라 **DB가 어떤 길로 데이터를 찾는지 지도처럼 확인한 것**입니다.

---

## 12. B-tree / 복합 인덱스

PostgreSQL 공식문서는 인덱스가 특정 행을 더 빠르게 찾고 가져오도록 도와주는 성능 향상 수단이지만, 전체 DB 시스템에 overhead도 추가되므로 신중하게 사용해야 한다고 설명합니다.

IF에서는 모든 컬럼에 인덱스를 건 것이 아니라, 실제 조회 패턴에 맞춰 인덱스를 추가했습니다.

```text id="g1yt7w"
자주 쓰는 조회 패턴

1. 최신 평가 목록
   ORDER BY assessed_at DESC LIMIT 50

2. 상태별 조회
   WHERE status = ?

3. 지원자별 최근 평가
   WHERE applicant_id = ?
   ORDER BY assessed_at DESC
```

PostgreSQL 공식문서는 B-tree 인덱스가 정렬된 출력을 만들 수 있으며, 인덱스가 `ORDER BY`를 별도 정렬 없이 처리하는 데 활용될 수 있다고 설명합니다.

또한 PostgreSQL 공식문서는 하나의 테이블에서 여러 컬럼을 묶은 multicolumn index를 정의할 수 있다고 설명합니다.

비전공자식으로 말하면,
전체 평가표를 매번 뒤져 정렬하지 않고, **최신순·지원자별로 미리 정리된 색인표를 만들어둔 것**입니다.

---

## 13. Partial Index

`risk_grade = 'HIGH'`처럼 특정 조건의 데이터만 자주 조회한다면 전체 테이블을 모두 인덱싱할 필요가 없습니다.

PostgreSQL 공식문서는 Partial Index를 테이블의 일부 행에 대해서만 만들어지는 인덱스라고 설명하며, 그 subset은 조건식으로 정의됩니다.

IF에서는 고위험 평가만 빠르게 찾기 위해 `risk_grade = 'HIGH'` 조건의 Partial Index를 추가했습니다.

```text id="a595tu"
전체 평가 데이터:
LOW / MEDIUM / HIGH 모두 존재

관리자 위험 모니터링:
HIGH만 자주 확인

개선:
HIGH 데이터만 인덱싱
→ 인덱스 크기와 탐색 범위 감소
```

비전공자식으로 말하면,
전체 서류철에 책갈피를 다 붙이는 게 아니라, **고위험 서류철에만 별도 책갈피를 붙인 것**입니다.

---

## 14. Materialized View

대시보드 집계는 매번 원본 테이블을 직접 세는 것보다, 미리 계산된 요약 결과를 읽는 방식이 유리할 수 있습니다.

PostgreSQL 공식문서는 Materialized View가 일반 View처럼 rule system을 사용하지만, 결과를 table-like form으로 저장한다고 설명합니다. 또한 `REFRESH MATERIALIZED VIEW`는 Materialized View의 내용을 교체하는 명령입니다.

```text id="3siird"
Before

대시보드 접속
→ count 전체
→ status별 count
→ risk_grade별 count

After

미리 계산된 Materialized View 조회
→ 대시보드 집계 조회 부담 감소
```

비전공자식으로 말하면,
매번 전체 장부를 새로 세는 대신, **미리 만들어둔 통계표를 읽는 구조**입니다.

---

## 15. 증분 적재와 UPSERT

분석용 `fact_assessment`는 매번 전체를 다시 넣기보다, `updated_at` 기준으로 변경분만 반영하도록 구성했습니다.

PostgreSQL 공식문서는 `INSERT ... ON CONFLICT`가 unique constraint나 exclusion constraint 충돌 시 오류를 내는 대신 대체 동작을 지정할 수 있다고 설명합니다.

```text id="4gd6oq"
기존 방식:
전체 데이터를 다시 적재

개선 방식:
updated_at 기준 변경분만 확인
→ 있으면 UPDATE
→ 없으면 INSERT
```

비전공자식으로 말하면,
매일 전체 명단을 새로 베껴 쓰는 게 아니라, **어제 이후 바뀐 사람만 고치거나 추가하는 방식**입니다.

---

## 16. CHECK / FK / 데이터 무결성

IF에서는 `status`, `risk_grade` 같은 허용값과 참조 관계를 DB 제약조건으로 고정했습니다.

```text id="wiiowq"
애플리케이션 코드만 믿는 구조:
잘못된 값이 DB에 들어갈 가능성 존재

DB 제약조건 추가:
DB 단계에서 잘못된 값 차단
→ 데이터 품질 안정성 증가
```

비전공자식으로 말하면,
입력 화면에서만 검사하는 게 아니라, **DB 창고 입구에서도 잘못된 값을 한 번 더 막는 구조**입니다.

---

## 17. 데이터 분석 구조 확장: Star Schema

IF는 운영 테이블만 두지 않고, 분석용 구조도 분리했습니다.

```text id="zfkszi"
dim_date
dim_job
dim_applicant
fact_assessment
```

비전공자 관점에서 Star Schema는 **분석용 표를 보기 쉽게 다시 정리한 구조**입니다.

```text id="1xeqbr"
운영 DB:
서비스가 정상 동작하기 좋은 구조

분석 DB:
날짜별, 직무별, 지원자별로 빠르게 집계하기 좋은 구조
```

즉, 운영 화면과 분석 화면이 같은 테이블을 무리하게 공유하지 않도록, 분석용 fact/dimension 구조를 별도로 만든 것입니다.

---

## 18. DB 효율화 측정 결과

로컬 PostgreSQL 2만 건 기준으로 `EXPLAIN ANALYZE`를 재측정했습니다.

| 쿼리                                                 | 인덱스 없음                 | 인덱스 있음                              | 개선            |
| -------------------------------------------------- | ---------------------- | ----------------------------------- | ------------- |
| `ORDER BY assessed_at DESC LIMIT 50`               | Seq Scan + Sort 5.82ms | `idx_assessment_assessed_at` 0.76ms | 87.0% 감소      |
| 문서 2만 건 기준                                         | 11.4ms                 | 0.44ms                              | 96.1% 감소      |
| `WHERE applicant_id = ? ORDER BY assessed_at DESC` | —                      | 복합 인덱스 0.08ms                       | 지원자별 최근 평가 조회 |
| `WHERE risk_grade = 'HIGH'` 집계                     | —                      | Partial Index Bitmap Scan           | HIGH만 스캔      |

문서용으로는 이렇게 쓰면 됩니다.

> 로컬 PostgreSQL 2만 건 기준 `EXPLAIN ANALYZE` 재측정 결과, `ORDER BY assessed_at DESC LIMIT 50` 조회는 인덱스 적용 전 `Seq Scan + Sort`로 5.82ms가 소요되었고, 인덱스 적용 후 `idx_assessment_assessed_at`을 사용해 0.76ms로 감소했습니다. 동일한 2만 건 기준 문서 측정값에서는 11.4ms에서 0.44ms로 감소해 약 96.1%의 조회 시간 개선을 확인했습니다.

---

# Part 3. 최종 정리

## 19. 최종적으로 줄어든 비용

```text id="k5qlpw"
1. 대시보드 목록 조회 SQL 증가 위험 감소
2. N+1 문제가 다시 생겼을 때 테스트 단계에서 감지 가능
3. 최신순 목록 조회의 Seq Scan + Sort 부담 감소
4. 고위험 평가 조회 범위 감소
5. 대시보드 집계 쿼리 부담 감소
6. 분석용 테이블과 운영용 테이블 역할 분리
7. 증분 적재로 전체 재처리 비용 감소
8. DB 제약조건으로 데이터 품질 안정성 강화
```

---

## 20. 포트폴리오용 설명

IF의 코드 효율화는 대시보드 목록 조회에서 발생할 수 있는 N+1 문제를 DTO Projection과 회귀 테스트로 차단한 작업입니다. 기존 Entity 중심 조회는 데이터 건수에 따라 연관 엔티티 접근 쿼리가 늘어날 수 있었지만, JPQL 생성자 projection으로 필요한 컬럼만 조회하도록 변경해 목록 조회 SQL을 join 1번과 count 1번, 총 2개로 고정했습니다.

또한 조회 전용 서비스에는 `@Transactional(readOnly = true)`를 적용하고, `spring.jpa.open-in-view=false`로 요청 전체에 영속성 컨텍스트가 유지되는 구조를 피했습니다. 이를 통해 Service 트랜잭션 안에서 필요한 데이터를 명시적으로 조회하도록 만들었습니다.

DB 효율화는 PostgreSQL 인덱스, Partial Index, Materialized View, Star Schema, 증분 적재, 품질 검사 SQL로 나눠 적용했습니다. PostgreSQL 공식문서 기준으로 인덱스는 특정 행을 더 빠르게 찾는 데 도움을 주며, B-tree 인덱스는 `ORDER BY`를 별도 정렬 없이 처리하는 데 활용될 수 있습니다.

로컬 PostgreSQL 2만 건 기준 `EXPLAIN ANALYZE` 재측정 결과, `ORDER BY assessed_at DESC LIMIT 50` 쿼리는 인덱스 적용 전 5.82ms에서 적용 후 0.76ms로 줄어 약 87.0% 개선되었습니다. 문서 기준 측정값으로는 11.4ms에서 0.44ms로 줄어 약 96.1% 개선을 확인했습니다.

추가로 `risk_grade = 'HIGH'` 조건에는 Partial Index를 적용해 고위험 데이터만 인덱싱했고, 대시보드 집계에는 Materialized View를 구성했습니다. 마지막으로 Hibernate Statistics 기반 N+1 회귀 테스트와 H2 테스트 프로파일을 추가해, 향후 목록 조회 쿼리 수가 다시 증가하면 테스트 단계에서 감지되도록 했습니다.

---

## 21. 한 줄 설명

> **IF는 대시보드 목록 조회를 DTO Projection으로 바꿔 SQL 수를 2개로 고정하고, PostgreSQL 인덱스·Partial Index·Materialized View·증분 적재 구조를 추가해 로컬 PostgreSQL 2만 건 기준 최신순 조회 시간을 최대 96.1% 개선한 코드·DB 효율화 작업입니다.**

---

## 22. README 카드용 문장

> **대시보드 N+1 가능성을 DTO Projection과 Hibernate Statistics 테스트로 차단하고, PostgreSQL 인덱스·Partial Index·Materialized View를 적용해 로컬 PostgreSQL 2만 건 기준 최신순 조회 성능을 최대 96.1% 개선했습니다.**

---

## 23. 공식문서 참고

| 적용 내용                                     | 공식문서                                         |
| ----------------------------------------- | -------------------------------------------- |
| DTO Projection                            | Spring Data JPA Projections                  |
| `@Transactional` / readOnly               | Spring `@Transactional` Reference / Javadoc  |
| Repository 지원                             | Spring Data JPA Repository Support           |
| open-in-view 비활성화                         | Spring Boot SQL / Open EntityManager in View |
| PostgreSQL `CREATE INDEX` / Partial Index | PostgreSQL `CREATE INDEX`                    |
| PostgreSQL Multicolumn Index              | PostgreSQL Multicolumn Indexes               |
| PostgreSQL Partial Index                  | PostgreSQL Partial Indexes                   |
| PostgreSQL Materialized View Refresh      | PostgreSQL `REFRESH MATERIALIZED VIEW`       |

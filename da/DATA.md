# 데이터 저장소: PostgreSQL 통일

- **백엔드(Spring)** 만 DB를 사용하며, **PostgreSQL** 단일 DB입니다.
- **웹(Next.js)** · **앱(Expo)** 은 DB에 직접 연결하지 않고, Spring API(`http://localhost:8080` 등)를 호출합니다.
- 따라서 웹·앱 모두 동일한 PostgreSQL 데이터(일자리, 신청자, 평가 기록 등)를 API를 통해 사용합니다.
- 공공데이터는 운영 도메인(Applicant/Assessment/Health)과 분리된 `external_ref` Reference/Context 스키마와 `ai/data/external` 파일 snapshot으로 관리합니다.
- 분석(DA)은 `analytics` Star Schema와 `analytics.v_kpi_*` 뷰로 제품·Reference KPI를 재현하며, 외부 통계로 개인 score를 바꾸지 않습니다. 상세는 [`DA.md`](DA.md).
- Backend(BE) API·상태전이·AI 연동 스펙은 [`../BE.md`](../BE.md).
- GenAI 설명(Gemini) 스펙·score 불변 원칙은 [`../AI.md`](../AI.md).
- ML/DL 경계·규칙통계 baseline(`rule_stat_v1`)은 [`../ML.md`](../ML.md) (ML serving은 PROPOSED).
- 품질·Release Gate·불변식은 [`../QA.md`](../QA.md).

## 설정 요약

| 구분 | 설정 |
|------|------|
| DB | PostgreSQL (`if_spring` DB) |
| Spring 기본 프로필 | `default` → `if_user` 계정 |
| Spring 로컬 프로필 | `local` → `postgres` 계정 |
| 웹 API 주소 | `NEXT_PUBLIC_API_URL` (기본 `http://localhost:8080`) |
| 앱 API 주소 | `EXPO_PUBLIC_API_URL` 또는 앱 내 "서버 연결 설정" |

## PostgreSQL 준비 (로컬)

```bash
# if_user 사용 (default 프로필)
createuser -P if_user
createdb -O if_user if_spring

# 또는 postgres 계정 사용 (local 프로필)
createdb if_spring
# application-local.yml: username: postgres, password: postgres
```

Spring 비밀번호는 `spring/src/main/resources/application.yml`의 `password`를 `createuser` 시 입력한 값과 맞추면 됩니다.

## 공공데이터 Ingestion

외부 공공데이터는 개인 위험도 정답(label)이 아니며, BE/DA가 참조하는 지역·기관·공고·고용·산재 Context로만 사용합니다. 수집 실패, API 장애, schema drift는 raw snapshot과 DQ/lineage에 기록하고 serving 반영을 중단하지만 Applicant/Assessment 트랜잭션을 중단시키지 않습니다.

```bash
cd ai
PYTHONPATH=. python3 -m src.etl.02_external_public_ingestion \
  --source self_support_region_code \
  --input-file data/raw/sample_region.xml \
  --idempotency-key 2026-08
```

DB 스키마와 DQ:

```bash
cd spring
./db/apply-schema.sh
PGPASSWORD=change-me psql -h localhost -U if_user -d if_spring -f db/quality/external_checks.sql
PGPASSWORD=change-me psql -h localhost -U if_user -d if_spring -f db/quality/analytics_checks.sql
```

## Analytics KPI (DA)

```bash
cd spring
./db/apply-schema.sh
./db/pipeline/run_all.sh

PGPASSWORD=change-me psql -h localhost -U if_user -d if_spring \
  -c "SELECT * FROM analytics.v_kpi_risk_grade_mix ORDER BY full_date DESC LIMIT 20;"
```

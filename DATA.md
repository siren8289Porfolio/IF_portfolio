# 데이터 저장소: PostgreSQL 통일

- **백엔드(Spring)** 만 DB를 사용하며, **PostgreSQL** 단일 DB입니다.
- **웹(Next.js)** · **앱(Expo)** 은 DB에 직접 연결하지 않고, Spring API(`http://localhost:8080` 등)를 호출합니다.
- 따라서 웹·앱 모두 동일한 PostgreSQL 데이터(일자리, 신청자, 평가 기록 등)를 API를 통해 사용합니다.

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

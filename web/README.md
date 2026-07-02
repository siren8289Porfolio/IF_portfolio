# IF web (Next.js)

고령자 노동·돌봄 규제 판단 웹앱의 프론트엔드. MVP 3대 기능만 다룬다.

1. 신청자 정보 + 건강 스냅샷 입력 (`features/assessment`)
2. AI 위험도 분석 (`features/risk`) — Spring 경유로 FastAPI `/score`, `/explain` 호출
3. 대시보드 기록 관리: 목록/상태수정/삭제 (`features/dashboard`)

## 실행

```bash
npm install
npm run dev
```

`.env.local.example`을 참고해 `.env.local`을 만들고 Spring 백엔드 주소를 설정한다.

## 주요 스크립트

- `npm run dev` — 개발 서버
- `npm run build` — 프로덕션 빌드 (타입 체크 포함)
- `npm run start` — 빌드된 앱 실행

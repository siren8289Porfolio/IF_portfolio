# DB

PostgreSQL / 스키마·파이프라인 역할 문서를 `db/` 폴더로 모았습니다.

구현 소스의 **단일 진실 공급원(source of truth)** 은 그대로 `spring/db/` 입니다.  
이 폴더는 포트폴리오 탐색용 진입점이며, SQL·쉘 스크립트는 이동하지 않습니다.

## 구현 위치

| 영역 | 경로 | 역할 |
| --- | --- | --- |
| 운영 OLTP | `spring/db/operational/` | 테이블·인덱스·제약·Summary MV |
| 분석 Star Schema | `spring/db/analytics/` | dim/fact · KPI 뷰 |
| 공공 Reference | `spring/db/external/` | Source Catalog · raw · serving |
| 품질 검사 | `spring/db/quality/` | 운영 / external / analytics DQ |
| 파이프라인 | `spring/db/pipeline/` | 증분 적재 · MV 갱신 |
| 상세 README | [`../spring/db/README.md`](../spring/db/README.md) | 로드맵·명령어 |

## 관련 스펙

- Data Engineering (DE-01~05): [`../de/DE.md`](../de/DE.md)
- Data Analytics (DA-01~04): [`../da/DA.md`](../da/DA.md)
- 저장소·연결 요약: [`../da/DATA.md`](../da/DATA.md)

## 빠른 시작

```bash
cd spring
chmod +x db/*.sh db/pipeline/*.sh
./db/init-db.sh                  # 최초: DB 생성 + 스키마
./db/apply-schema.sh             # 스키마만 갱신
./db/pipeline/run_all.sh         # 적재 → 품질 → MV
```

검증:

```bash
cd spring
PGPASSWORD=change-me psql -h localhost -U if_user -d if_spring -f db/quality/checks.sql
PGPASSWORD=change-me psql -h localhost -U if_user -d if_spring -f db/quality/external_checks.sql
PGPASSWORD=change-me psql -h localhost -U if_user -d if_spring -f db/quality/analytics_checks.sql
```

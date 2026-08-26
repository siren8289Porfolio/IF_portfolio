## Elder Risk AI – PoC to API

이 폴더(`ai/`)는 고령자 일자리/지역 데이터를 이용해서 **로그인 없이 바로 쓰는 PoC → 모델/설명 레이어 → API 서비스**까지 한 번에 가는 실험용 프로젝트입니다.

### 1. 전체 구조

```bash
ai/
  README.md
  requirements.txt
  .env.example

  data/
    raw/           # 원본 CSV/XLSX (수정 금지, 지금 가지고 있는 파일들 그대로 두기)
    interim/       # 인코딩/컬럼 정리 후 중간 결과 (parquet)
    marts/         # API/모델이 바로 쓰는 최종 테이블

  src/
    etl/
      00_convert_encoding.py
      01_build_job_risk_by_region.py

    app/
      main.py
      schemas.py
      services/
        scoring_service.py
```

> 이미 `ai/` 안에 있는 CSV/PDF는 `data/raw`로 옮기거나, 복사만 해 두면 됩니다.  
> 예: `고용노동부 산업재해현황_20231231.csv` → `ai/data/raw/고용노동부 산업재해현황_20231231.csv`

### 2. 설치

```bash
cd ai
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
```

### 3. ETL 실행 (EUC-KR → UTF-8 + mart 생성)

1. `data/raw`에 아래 파일들을 넣습니다.
   - `고용노동부 산업재해현황_20231231.csv`
   - `국민건강보험공단_노인장기요양보험 등급판정 현황_20251231.CSV` (지금은 점수에는 안 씀)
2. 인코딩 변환 + parquet 저장:

```bash
python -m src.etl.00_convert_encoding
```

3. 산재 기반 직무/지역 위험 mart 생성:

```bash
python -m src.etl.01_build_job_risk_by_region
```

생성 결과:

- `data/interim/moel_accident_2023.parquet`
- `data/marts/job_risk_by_region.parquet`

### 4. 공공 Reference/Context 수집

공공 DE 파이프라인(코드·DDL·DQ·테스트)은 루트 [`de/`](../de/) 로 분리했습니다. 실행·스펙은 [`de/README.md`](../de/README.md), [`de/DE.md`](../de/DE.md)를 보세요.

### 5. FastAPI 실행

```bash
uvicorn src.app.main:app --reload
```

엔드포인트:

- `POST /score`
  - 입력: 연령대, 지역, 직무군, 근무강도, 환경/건강 태그
  - 내부에서 `job_risk_by_region.parquet`를 읽어 0~100 점수와 주요 요인을 계산
  - **authoritative** — LLM이 점수를 바꾸지 않음 (`scoring_version=rule_stat_v1`, 상세 `ML.md`)
- `POST /explain`
  - 입력: 이미 계산된 `risk_score` / `risk_band` / `top_factors` / 비식별 요약
  - Gemini로 자연어 설명만 생성 (`prompt_v1`). 실패 시 deterministic fallback
  - 스펙·Evidence: 루트 `AI.md`

ML 실험 공간(미서빙): `ai/ml/` — 승인 gate 전 `/score`에 연결하지 않음.
### 6. 테스트

```bash
PYTHONPATH=. python3 -m unittest discover -s tests
```

포함: AI score 불변성·guardrails·fallback (`tests/test_ai_invariants.py`).  
공공 ingestion 테스트는 `de/tests/` 에 있습니다.

### 7. 다음 확장 포인트

- `국민건강보험공단_노인장기요양보험 등급판정 현황`으로 `care_risk_by_region` mart 추가
- 노인일자리 실태조사(개인 데이터)로 feature set 만들고 ML 모델(`models/`) 추가
- token/cost 계측, live Gemini evaluation set

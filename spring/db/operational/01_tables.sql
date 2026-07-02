-- =============================================================================
-- 1. 운영 DB (정규화) — 엔티티와 1:1 대응
--    책임 분리: applicant / health_snapshot / job / assessment / ai_risk_result
-- =============================================================================

-- 관리자
CREATE TABLE IF NOT EXISTS admin_user (
    admin_id        BIGSERIAL PRIMARY KEY,
    name            VARCHAR(255),
    organization    VARCHAR(255),
    role            VARCHAR(50),          -- operator / supervisor
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 신청자
CREATE TABLE IF NOT EXISTS applicant (
    applicant_id    BIGSERIAL PRIMARY KEY,
    display_name    VARCHAR(255),
    age             INTEGER CHECK (age IS NULL OR (age >= 0 AND age <= 150)),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 직무
CREATE TABLE IF NOT EXISTS job (
    job_id          BIGSERIAL PRIMARY KEY,
    job_title       VARCHAR(255),
    workplace       VARCHAR(255),
    work_hours      VARCHAR(255),
    description     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 건강 스냅샷 (평가 시점 고정 — 신청자와 분리)
CREATE TABLE IF NOT EXISTS health_snapshot (
    health_id               BIGSERIAL PRIMARY KEY,
    applicant_id            BIGINT NOT NULL REFERENCES applicant(applicant_id),
    physical_level          INTEGER CHECK (physical_level IS NULL OR (physical_level BETWEEN 1 AND 5)),
    chronic_disease_flag    BOOLEAN,
    work_hour_limit         INTEGER CHECK (work_hour_limit IS NULL OR work_hour_limit >= 0),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 평가 기록 (ai_result_id FK는 03_constraints.sql에서 순환 참조 해결 후 추가)
CREATE TABLE IF NOT EXISTS assessment (
    assessment_id   BIGSERIAL PRIMARY KEY,
    applicant_id    BIGINT NOT NULL REFERENCES applicant(applicant_id),
    job_id          BIGINT NOT NULL REFERENCES job(job_id),
    health_id       BIGINT NOT NULL REFERENCES health_snapshot(health_id),
    admin_id        BIGINT REFERENCES admin_user(admin_id),
    ai_result_id    BIGINT,             -- → ai_risk_result (03에서 FK)
    status          VARCHAR(20) NOT NULL DEFAULT 'PENDING_AI',
    assessed_at     TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- AI 위험도 결과
CREATE TABLE IF NOT EXISTS ai_risk_result (
    ai_result_id        BIGSERIAL PRIMARY KEY,
    assessment_id       BIGINT REFERENCES assessment(assessment_id),
    total_risk_percent  INTEGER CHECK (total_risk_percent IS NULL OR (total_risk_percent BETWEEN 0 AND 100)),
    risk_grade          VARCHAR(10) CHECK (risk_grade IS NULL OR risk_grade IN ('LOW', 'MID', 'HIGH')),
    generated_at        TIMESTAMPTZ,
    model_version       VARCHAR(100),
    explanation_json    TEXT,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 파이프라인/배치 실행 로그 (관측 가능성 — 로드맵 15)
CREATE TABLE IF NOT EXISTS pipeline_run_log (
    run_id                  BIGSERIAL PRIMARY KEY,
    job_name                VARCHAR(100) NOT NULL,
    started_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at             TIMESTAMPTZ,
    processed_row_count     BIGINT DEFAULT 0,
    failed_row_count        BIGINT DEFAULT 0,
    source_max_updated_at   TIMESTAMPTZ,
    target_max_updated_at   TIMESTAMPTZ,
    status                  VARCHAR(20) NOT NULL DEFAULT 'RUNNING'
                            CHECK (status IN ('RUNNING', 'SUCCESS', 'FAILED')),
    error_message           TEXT
);

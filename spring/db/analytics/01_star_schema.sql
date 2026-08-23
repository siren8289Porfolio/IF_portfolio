-- =============================================================================
-- 2. 분석 DB — Star Schema (운영 DB와 스키마 분리)
--    Fact: 평가 이벤트 / Dimension: 날짜·신청자·직무
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS analytics;

-- Dimension: 날짜
CREATE TABLE IF NOT EXISTS analytics.dim_date (
    date_id     INTEGER PRIMARY KEY,     -- YYYYMMDD
    full_date   DATE NOT NULL UNIQUE,
    year        SMALLINT NOT NULL,
    quarter     SMALLINT NOT NULL CHECK (quarter BETWEEN 1 AND 4),
    month       SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
    day         SMALLINT NOT NULL CHECK (day BETWEEN 1 AND 31)
);

-- Dimension: 직무 (운영 job 스냅샷)
CREATE TABLE IF NOT EXISTS analytics.dim_job (
    job_id      BIGINT PRIMARY KEY,
    job_title   VARCHAR(255),
    workplace   VARCHAR(255),
    work_hours  VARCHAR(255),
    loaded_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dimension: 신청자 (운영 applicant 스냅샷)
CREATE TABLE IF NOT EXISTS analytics.dim_applicant (
    applicant_id    BIGINT PRIMARY KEY,
    display_name    VARCHAR(255),
    age             INTEGER,
    loaded_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dimension: 기관 (운영 admin_user.organization 스냅샷 — DA org segment)
CREATE TABLE IF NOT EXISTS analytics.dim_organization (
    org_id          BIGSERIAL PRIMARY KEY,
    organization    VARCHAR(255) NOT NULL UNIQUE,
    loaded_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Dimension: 위험 등급 (고정 코드)
CREATE TABLE IF NOT EXISTS analytics.dim_risk_grade (
    risk_grade      VARCHAR(10) PRIMARY KEY,
    sort_order      SMALLINT NOT NULL,
    description     VARCHAR(100)
);

INSERT INTO analytics.dim_risk_grade (risk_grade, sort_order, description) VALUES
    ('LOW', 1, '저위험'),
    ('MID', 2, '중위험'),
    ('HIGH', 3, '고위험')
ON CONFLICT (risk_grade) DO NOTHING;

-- Fact: 평가 + AI 결과 (조회·집계 최적화 flat 구조)
CREATE TABLE IF NOT EXISTS analytics.fact_assessment (
    fact_id             BIGSERIAL PRIMARY KEY,
    assessment_id       BIGINT NOT NULL UNIQUE,
    date_id             INTEGER REFERENCES analytics.dim_date(date_id),
    job_id              BIGINT REFERENCES analytics.dim_job(job_id),
    applicant_id        BIGINT REFERENCES analytics.dim_applicant(applicant_id),
    org_id              BIGINT REFERENCES analytics.dim_organization(org_id),
    status              VARCHAR(20) NOT NULL,
    total_risk_percent  INTEGER,
    risk_grade          VARCHAR(10) REFERENCES analytics.dim_risk_grade(risk_grade),
    physical_level      INTEGER,
    assessed_at         TIMESTAMPTZ,
    source_updated_at   TIMESTAMPTZ,     -- 운영 DB assessment.updated_at (증분 기준)
    loaded_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 기존 DB 호환: org_id / risk_grade FK 보강
ALTER TABLE analytics.fact_assessment
    ADD COLUMN IF NOT EXISTS org_id BIGINT REFERENCES analytics.dim_organization(org_id);

-- 분석용 인덱스 (로드맵 5 — WHERE/JOIN/ORDER BY)
CREATE INDEX IF NOT EXISTS idx_fact_assessment_date
    ON analytics.fact_assessment (date_id);

CREATE INDEX IF NOT EXISTS idx_fact_assessment_status
    ON analytics.fact_assessment (status);

CREATE INDEX IF NOT EXISTS idx_fact_assessment_risk_grade
    ON analytics.fact_assessment (risk_grade)
    WHERE risk_grade IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fact_assessment_source_updated
    ON analytics.fact_assessment (source_updated_at);

CREATE INDEX IF NOT EXISTS idx_fact_assessment_assessed_at
    ON analytics.fact_assessment (assessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_fact_assessment_org
    ON analytics.fact_assessment (org_id)
    WHERE org_id IS NOT NULL;

-- KPI 정의 버전 (DA-01 / DA-04)
CREATE TABLE IF NOT EXISTS analytics.kpi_definition (
    kpi_id              VARCHAR(80) PRIMARY KEY,
    kpi_name            VARCHAR(200) NOT NULL,
    formula             TEXT NOT NULL,
    grain               VARCHAR(200) NOT NULL,
    dimensions          TEXT,
    source_object       VARCHAR(200),
    owner_role          VARCHAR(80),
    evidence_status     VARCHAR(30) NOT NULL
                        CHECK (evidence_status IN ('IMPLEMENTED', 'DESIGNED', 'PLANNED', 'NOT_TESTED')),
    version             VARCHAR(20) NOT NULL DEFAULT 'v1',
    notes               TEXT,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

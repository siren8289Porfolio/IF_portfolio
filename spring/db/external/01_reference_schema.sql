-- =============================================================================
-- External public reference data schema
-- - Separated from IF operational domain tables.
-- - Raw snapshots are immutable; serving tables are rebuilt/upserted from accepted
--   normalized rows after DQ checks.
-- =============================================================================

CREATE SCHEMA IF NOT EXISTS external_ref;

CREATE TABLE IF NOT EXISTS external_ref.source_catalog (
    source_id           BIGSERIAL PRIMARY KEY,
    source_name         VARCHAR(200) NOT NULL,
    source_url          TEXT NOT NULL,
    source_type         VARCHAR(30) NOT NULL CHECK (source_type IN ('OPENAPI_XML', 'OPENAPI_JSON', 'FILE_CSV', 'FILE_XLSX', 'KOSIS')),
    serving_target      VARCHAR(100) NOT NULL,
    is_required_for_core BOOLEAN NOT NULL DEFAULT false,
    collection_frequency VARCHAR(50),
    license_note        TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (source_name, source_url)
);

CREATE TABLE IF NOT EXISTS external_ref.external_ingestion_run (
    ingestion_run_id    BIGSERIAL PRIMARY KEY,
    source_id           BIGINT NOT NULL REFERENCES external_ref.source_catalog(source_id),
    idempotency_key     VARCHAR(200) NOT NULL,
    status              VARCHAR(20) NOT NULL DEFAULT 'RUNNING'
                        CHECK (status IN ('RUNNING', 'SUCCESS', 'FAILED', 'SCHEMA_DRIFT', 'DQ_FAILED')),
    started_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    finished_at         TIMESTAMPTZ,
    raw_row_count       BIGINT NOT NULL DEFAULT 0,
    accepted_row_count  BIGINT NOT NULL DEFAULT 0,
    rejected_row_count  BIGINT NOT NULL DEFAULT 0,
    source_updated_at   TIMESTAMPTZ,
    error_message       TEXT,
    UNIQUE (source_id, idempotency_key)
);

CREATE TABLE IF NOT EXISTS external_ref.raw_external_snapshot (
    raw_snapshot_id     BIGSERIAL PRIMARY KEY,
    ingestion_run_id    BIGINT NOT NULL REFERENCES external_ref.external_ingestion_run(ingestion_run_id),
    source_id           BIGINT NOT NULL REFERENCES external_ref.source_catalog(source_id),
    source_key          VARCHAR(300) NOT NULL,
    source_updated_at   TIMESTAMPTZ,
    collected_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    schema_version      VARCHAR(50) NOT NULL,
    payload             JSONB NOT NULL,
    checksum            CHAR(64) NOT NULL,
    UNIQUE (source_id, source_key, schema_version, checksum)
);

CREATE TABLE IF NOT EXISTS external_ref.dq_check_result (
    dq_check_result_id  BIGSERIAL PRIMARY KEY,
    ingestion_run_id    BIGINT NOT NULL REFERENCES external_ref.external_ingestion_run(ingestion_run_id),
    check_name          VARCHAR(120) NOT NULL,
    status              VARCHAR(20) NOT NULL CHECK (status IN ('PASS', 'FAIL', 'WARN')),
    checked_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    expected_value      TEXT,
    actual_value        TEXT,
    message             TEXT
);

CREATE TABLE IF NOT EXISTS external_ref.lineage_event (
    lineage_event_id    BIGSERIAL PRIMARY KEY,
    ingestion_run_id    BIGINT REFERENCES external_ref.external_ingestion_run(ingestion_run_id),
    source_id           BIGINT REFERENCES external_ref.source_catalog(source_id),
    from_layer          VARCHAR(50) NOT NULL,
    to_layer            VARCHAR(50) NOT NULL,
    target_table        VARCHAR(120) NOT NULL,
    row_count           BIGINT NOT NULL DEFAULT 0,
    event_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    checksum            CHAR(64),
    note                TEXT
);

CREATE TABLE IF NOT EXISTS external_ref.region_master (
    region_id           BIGSERIAL PRIMARY KEY,
    region_code         VARCHAR(50) NOT NULL,
    region_name         VARCHAR(200) NOT NULL,
    parent_region_code  VARCHAR(50),
    region_level        VARCHAR(30),
    source_name         VARCHAR(200) NOT NULL,
    source_url          TEXT NOT NULL,
    source_key          VARCHAR(300) NOT NULL,
    source_updated_at   TIMESTAMPTZ,
    collected_at        TIMESTAMPTZ NOT NULL,
    schema_version      VARCHAR(50) NOT NULL,
    checksum            CHAR(64) NOT NULL,
    active_from         TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (source_name, source_key)
);

CREATE TABLE IF NOT EXISTS external_ref.organization_master (
    organization_id     BIGSERIAL PRIMARY KEY,
    organization_code   VARCHAR(80) NOT NULL,
    organization_name   VARCHAR(250) NOT NULL,
    organization_type   VARCHAR(100),
    region_code         VARCHAR(50),
    address             TEXT,
    phone               VARCHAR(80),
    source_name         VARCHAR(200) NOT NULL,
    source_url          TEXT NOT NULL,
    source_key          VARCHAR(300) NOT NULL,
    source_updated_at   TIMESTAMPTZ,
    collected_at        TIMESTAMPTZ NOT NULL,
    schema_version      VARCHAR(50) NOT NULL,
    checksum            CHAR(64) NOT NULL,
    active_from         TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (source_name, source_key)
);

CREATE TABLE IF NOT EXISTS external_ref.job_posting_reference (
    job_posting_id      BIGSERIAL PRIMARY KEY,
    external_job_id     VARCHAR(120) NOT NULL,
    title               VARCHAR(300),
    organization_code   VARCHAR(80),
    region_code         VARCHAR(50),
    job_category        VARCHAR(150),
    employment_type     VARCHAR(100),
    recruitment_count   INTEGER CHECK (recruitment_count IS NULL OR recruitment_count >= 0),
    posting_start_date  DATE,
    posting_end_date    DATE,
    status              VARCHAR(80),
    workplace           TEXT,
    source_name         VARCHAR(200) NOT NULL,
    source_url          TEXT NOT NULL,
    source_key          VARCHAR(300) NOT NULL,
    source_updated_at   TIMESTAMPTZ,
    collected_at        TIMESTAMPTZ NOT NULL,
    schema_version      VARCHAR(50) NOT NULL,
    checksum            CHAR(64) NOT NULL,
    active_from         TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (source_name, source_key)
);

CREATE TABLE IF NOT EXISTS external_ref.job_reference (
    job_reference_id    BIGSERIAL PRIMARY KEY,
    business_year       INTEGER,
    business_name       VARCHAR(300) NOT NULL,
    business_type       VARCHAR(150),
    budget_amount       NUMERIC(18, 2),
    source_name         VARCHAR(200) NOT NULL,
    source_url          TEXT NOT NULL,
    source_key          VARCHAR(300) NOT NULL,
    source_updated_at   TIMESTAMPTZ,
    collected_at        TIMESTAMPTZ NOT NULL,
    schema_version      VARCHAR(50) NOT NULL,
    checksum            CHAR(64) NOT NULL,
    active_from         TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (source_name, source_key)
);

CREATE TABLE IF NOT EXISTS external_ref.elderly_employment_snapshot (
    elderly_employment_snapshot_id BIGSERIAL PRIMARY KEY,
    reference_period    VARCHAR(20) NOT NULL,
    region_code         VARCHAR(50) NOT NULL,
    age_group           VARCHAR(50) NOT NULL,
    metric              VARCHAR(120) NOT NULL,
    metric_value        NUMERIC(18, 6),
    unit                VARCHAR(50),
    source_name         VARCHAR(200) NOT NULL,
    source_url          TEXT NOT NULL,
    source_key          VARCHAR(300) NOT NULL,
    source_updated_at   TIMESTAMPTZ,
    collected_at        TIMESTAMPTZ NOT NULL,
    schema_version      VARCHAR(50) NOT NULL,
    checksum            CHAR(64) NOT NULL,
    active_from         TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (reference_period, region_code, age_group, metric, source_name)
);

CREATE TABLE IF NOT EXISTS external_ref.ai_job_risk_profile (
    ai_job_risk_profile_id BIGSERIAL PRIMARY KEY,
    industry_code       VARCHAR(80),
    industry_name       VARCHAR(250),
    job_category        VARCHAR(150),
    region_code         VARCHAR(50),
    age_group           VARCHAR(50),
    accident_type       VARCHAR(120),
    injured_count       BIGINT CHECK (injured_count IS NULL OR injured_count >= 0),
    death_count         BIGINT CHECK (death_count IS NULL OR death_count >= 0),
    accident_rate       NUMERIC(12, 6),
    accident_risk_score NUMERIC(8, 4) CHECK (accident_risk_score IS NULL OR (accident_risk_score >= 0 AND accident_risk_score <= 100)),
    reference_period    VARCHAR(20),
    source_name         VARCHAR(200) NOT NULL,
    source_url          TEXT NOT NULL,
    source_key          VARCHAR(300) NOT NULL,
    source_updated_at   TIMESTAMPTZ,
    collected_at        TIMESTAMPTZ NOT NULL,
    schema_version      VARCHAR(50) NOT NULL,
    checksum            CHAR(64) NOT NULL,
    active_from         TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (source_name, source_key)
);

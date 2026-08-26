-- =============================================================================
-- External reference indexes and utility triggers
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_source_catalog_target
    ON external_ref.source_catalog (serving_target);

CREATE INDEX IF NOT EXISTS idx_external_ingestion_run_source_started
    ON external_ref.external_ingestion_run (source_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_raw_external_snapshot_source_collected
    ON external_ref.raw_external_snapshot (source_id, collected_at DESC);

CREATE INDEX IF NOT EXISTS idx_dq_check_result_run_status
    ON external_ref.dq_check_result (ingestion_run_id, status);

CREATE INDEX IF NOT EXISTS idx_lineage_event_target_at
    ON external_ref.lineage_event (target_table, event_at DESC);

CREATE INDEX IF NOT EXISTS idx_region_master_code
    ON external_ref.region_master (region_code);

CREATE INDEX IF NOT EXISTS idx_organization_master_region
    ON external_ref.organization_master (region_code);

CREATE INDEX IF NOT EXISTS idx_job_posting_reference_region_status
    ON external_ref.job_posting_reference (region_code, status);

CREATE INDEX IF NOT EXISTS idx_elderly_employment_grain
    ON external_ref.elderly_employment_snapshot (reference_period, region_code, age_group, metric);

CREATE INDEX IF NOT EXISTS idx_ai_job_risk_profile_lookup
    ON external_ref.ai_job_risk_profile (industry_name, region_code, age_group);

DROP TRIGGER IF EXISTS trg_source_catalog_updated_at ON external_ref.source_catalog;
CREATE TRIGGER trg_source_catalog_updated_at
    BEFORE UPDATE ON external_ref.source_catalog
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- =============================================================================
-- External reference data quality gates.
-- These checks validate public Reference/Context tables only. They do not block
-- Applicant/Assessment transactions at application runtime.
-- =============================================================================

\set ON_ERROR_STOP on

\echo '=== 외부 Reference 품질 검사 시작 ==='

DO $$
DECLARE n BIGINT;
BEGIN
    SELECT count(*) INTO n FROM (
        SELECT source_name, source_key
        FROM external_ref.region_master
        GROUP BY source_name, source_key
        HAVING count(*) > 1
    ) t;
    IF n > 0 THEN RAISE EXCEPTION 'FAIL: region_master source natural key 중복 %건', n; END IF;

    SELECT count(*) INTO n FROM external_ref.region_master
    WHERE region_code IS NULL OR btrim(region_code) = '' OR region_name IS NULL OR btrim(region_name) = '';
    IF n > 0 THEN RAISE EXCEPTION 'FAIL: region_master 필수 식별자 NULL/blank %건', n; END IF;
END $$;

DO $$
DECLARE n BIGINT;
BEGIN
    SELECT count(*) INTO n FROM (
        SELECT source_name, source_key
        FROM external_ref.organization_master
        GROUP BY source_name, source_key
        HAVING count(*) > 1
    ) t;
    IF n > 0 THEN RAISE EXCEPTION 'FAIL: organization_master source natural key 중복 %건', n; END IF;

    SELECT count(*) INTO n FROM external_ref.organization_master
    WHERE organization_code IS NULL OR btrim(organization_code) = ''
       OR organization_name IS NULL OR btrim(organization_name) = '';
    IF n > 0 THEN RAISE EXCEPTION 'FAIL: organization_master 필수 식별자 NULL/blank %건', n; END IF;
END $$;

DO $$
DECLARE n BIGINT;
BEGIN
    SELECT count(*) INTO n FROM external_ref.job_posting_reference
    WHERE recruitment_count IS NOT NULL AND recruitment_count < 0;
    IF n > 0 THEN RAISE EXCEPTION 'FAIL: job_posting_reference 모집인원 음수 %건', n; END IF;

    SELECT count(*) INTO n FROM external_ref.job_posting_reference
    WHERE posting_start_date IS NOT NULL
      AND posting_end_date IS NOT NULL
      AND posting_start_date > posting_end_date;
    IF n > 0 THEN RAISE EXCEPTION 'FAIL: job_posting_reference 공고기간 역전 %건', n; END IF;
END $$;

DO $$
DECLARE n BIGINT;
BEGIN
    SELECT count(*) INTO n FROM (
        SELECT reference_period, region_code, age_group, metric, source_name
        FROM external_ref.elderly_employment_snapshot
        GROUP BY reference_period, region_code, age_group, metric, source_name
        HAVING count(*) > 1
    ) t;
    IF n > 0 THEN RAISE EXCEPTION 'FAIL: KOSIS grain 중복 %건', n; END IF;
END $$;

DO $$
DECLARE n BIGINT;
BEGIN
    SELECT count(*) INTO n FROM external_ref.external_ingestion_run r
    WHERE r.status = 'SUCCESS'
      AND r.raw_row_count <> r.accepted_row_count + r.rejected_row_count;
    IF n > 0 THEN RAISE EXCEPTION 'FAIL: raw row count 대사 실패 %건', n; END IF;
END $$;

\echo '=== 외부 Reference 품질 검사 통과 ==='

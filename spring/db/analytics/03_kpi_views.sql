-- =============================================================================
-- DA KPI 정의 시드 + 재현 가능 분석 뷰 (DA-01 / DA-03)
-- Evidence: DESIGNED — 대시보드·샘플 결과 연동 전
-- =============================================================================

INSERT INTO analytics.kpi_definition (
    kpi_id, kpi_name, formula, grain, dimensions, source_object, owner_role, evidence_status, version, notes
) VALUES
    ('KPI-ASSESSMENT-VOLUME', 'Assessment Volume',
     'COUNT(assessment) per day', 'day', 'date, status, org',
     'analytics.v_kpi_assessment_volume', 'PM/Ops', 'DESIGNED', 'v1', 'BQ-01'),
    ('KPI-FINALIZATION-RATE', 'Finalization Rate',
     'FINALIZED / total assessment', 'day', 'date, org',
     'analytics.v_kpi_finalization_rate', 'PM', 'DESIGNED', 'v1', 'BQ-01'),
    ('KPI-RISK-GRADE-MIX', 'Risk Grade Mix',
     'COUNT by risk_grade', 'day × risk_grade', 'date, job, org',
     'analytics.v_kpi_risk_grade_mix', 'PM/Policy', 'DESIGNED', 'v1', 'BQ-02'),
    ('KPI-COMPUTE-SUCCESS', 'Compute Success Rate',
     '(AI_COMPLETED + FINALIZED) / assessments with AI attempt', 'day', 'date',
     'analytics.v_kpi_compute_success_rate', 'BE', 'DESIGNED', 'v1',
     'BQ-03; PENDING_AI는 시도 중으로 분모에서 제외하지 않음(전체 대비 성공)'),
    ('KPI-EXPLAIN-FALLBACK', 'Explain Fallback Rate',
     'explain fail / score success', 'day', 'date',
     NULL, 'AI', 'PLANNED', 'v1', '이벤트 테이블 필요'),
    ('KPI-P95-COMPUTE-LATENCY', 'p95 Compute Latency',
     'p95(compute-risk duration)', 'day', 'date',
     NULL, 'BE', 'PLANNED', 'v1', '이벤트/메트릭 필요'),
    ('KPI-JOB-REF-COVERAGE', 'Job Reference Coverage',
     'mapped jobs / assessed jobs', 'snapshot', '—',
     'analytics.v_kpi_job_reference_coverage', 'DE/DA', 'DESIGNED', 'v1', 'BQ-04'),
    ('KPI-ORG-MATCH', 'Organization Match Rate',
     'matched org / distinct org inputs', 'snapshot', '—',
     'analytics.v_kpi_organization_match_rate', 'DE/DA', 'DESIGNED', 'v1', 'BQ-04'),
    ('KPI-REGION-MATCH', 'Region Code Match Rate',
     'matched workplace region / jobs with workplace', 'snapshot', '—',
     'analytics.v_kpi_region_code_match_rate', 'DE/DA', 'DESIGNED', 'v1', 'BQ-04; workplace 텍스트 매칭'),
    ('KPI-EXT-FRESHNESS', 'External Data Freshness',
     'hours since source_updated_at / collected_at', 'source × run', 'source',
     'analytics.v_kpi_external_data_freshness', 'DE', 'DESIGNED', 'v1', 'BQ-05'),
    ('KPI-EXT-DQ-PASS', 'External DQ Pass Rate',
     'PASS checks / all DQ checks', 'ingestion_run', 'source',
     'analytics.v_kpi_external_dq_pass_rate', 'DE', 'DESIGNED', 'v1', 'BQ-05'),
    ('KPI-CONTEXT-COVERAGE', 'Context Coverage',
     'regions with KOSIS snapshot / region_master', 'reference_period', 'period',
     'analytics.v_kpi_context_coverage', 'DA', 'DESIGNED', 'v1', 'BQ-06; 개인 판정 금지')
ON CONFLICT (kpi_id) DO UPDATE SET
    kpi_name = EXCLUDED.kpi_name,
    formula = EXCLUDED.formula,
    grain = EXCLUDED.grain,
    dimensions = EXCLUDED.dimensions,
    source_object = EXCLUDED.source_object,
    owner_role = EXCLUDED.owner_role,
    evidence_status = EXCLUDED.evidence_status,
    version = EXCLUDED.version,
    notes = EXCLUDED.notes,
    updated_at = now();

-- BQ-01: 일별 평가 건수
CREATE OR REPLACE VIEW analytics.v_kpi_assessment_volume AS
SELECT
    d.full_date,
    f.status,
    o.organization,
    count(*)::bigint AS assessment_count
FROM analytics.fact_assessment f
JOIN analytics.dim_date d ON d.date_id = f.date_id
LEFT JOIN analytics.dim_organization o ON o.org_id = f.org_id
GROUP BY d.full_date, f.status, o.organization;

-- BQ-01: 일별 FINALIZED 비율
CREATE OR REPLACE VIEW analytics.v_kpi_finalization_rate AS
SELECT
    d.full_date,
    o.organization,
    count(*)::bigint AS assessment_count,
    count(*) FILTER (WHERE f.status = 'FINALIZED')::bigint AS finalized_count,
    CASE WHEN count(*) = 0 THEN NULL
         ELSE round(
             100.0 * count(*) FILTER (WHERE f.status = 'FINALIZED') / count(*),
             2
         )
    END AS finalization_rate_pct
FROM analytics.fact_assessment f
JOIN analytics.dim_date d ON d.date_id = f.date_id
LEFT JOIN analytics.dim_organization o ON o.org_id = f.org_id
GROUP BY d.full_date, o.organization;

-- BQ-02: 위험 등급 분포
CREATE OR REPLACE VIEW analytics.v_kpi_risk_grade_mix AS
SELECT
    d.full_date,
    COALESCE(f.risk_grade, 'UNKNOWN') AS risk_grade,
    j.job_title,
    o.organization,
    count(*)::bigint AS assessment_count
FROM analytics.fact_assessment f
JOIN analytics.dim_date d ON d.date_id = f.date_id
LEFT JOIN analytics.dim_job j ON j.job_id = f.job_id
LEFT JOIN analytics.dim_organization o ON o.org_id = f.org_id
GROUP BY d.full_date, COALESCE(f.risk_grade, 'UNKNOWN'), j.job_title, o.organization;

-- BQ-03: compute 성공률 (상태 기반 근사 — latency는 PLANNED)
CREATE OR REPLACE VIEW analytics.v_kpi_compute_success_rate AS
SELECT
    d.full_date,
    count(*)::bigint AS compute_attempts,
    count(*) FILTER (WHERE f.status IN ('AI_COMPLETED', 'FINALIZED'))::bigint AS compute_success,
    CASE WHEN count(*) = 0 THEN NULL
         ELSE round(
             100.0 * count(*) FILTER (WHERE f.status IN ('AI_COMPLETED', 'FINALIZED')) / count(*),
             2
         )
    END AS compute_success_rate_pct
FROM analytics.fact_assessment f
JOIN analytics.dim_date d ON d.date_id = f.date_id
GROUP BY d.full_date;

-- BQ-04: Job → 공공 Reference 매핑 (title/business_name 정규화 매칭)
CREATE OR REPLACE VIEW analytics.v_kpi_job_reference_coverage AS
WITH assessed_jobs AS (
    SELECT DISTINCT f.job_id, lower(btrim(j.job_title)) AS job_key
    FROM analytics.fact_assessment f
    JOIN analytics.dim_job j ON j.job_id = f.job_id
    WHERE j.job_title IS NOT NULL AND btrim(j.job_title) <> ''
),
mapped AS (
    SELECT aj.job_id
    FROM assessed_jobs aj
    WHERE EXISTS (
        SELECT 1 FROM external_ref.job_reference jr
        WHERE lower(btrim(jr.business_name)) = aj.job_key
    )
    OR EXISTS (
        SELECT 1 FROM external_ref.job_posting_reference jp
        WHERE lower(btrim(jp.title)) = aj.job_key
    )
)
SELECT
    (SELECT count(*) FROM assessed_jobs)::bigint AS assessed_job_count,
    (SELECT count(*) FROM mapped)::bigint AS mapped_job_count,
    CASE WHEN (SELECT count(*) FROM assessed_jobs) = 0 THEN NULL
         ELSE round(
             100.0 * (SELECT count(*) FROM mapped) / (SELECT count(*) FROM assessed_jobs),
             2
         )
    END AS job_reference_coverage_pct;

-- BQ-04: 기관 매핑
CREATE OR REPLACE VIEW analytics.v_kpi_organization_match_rate AS
WITH org_inputs AS (
    SELECT DISTINCT btrim(organization) AS organization
    FROM admin_user
    WHERE organization IS NOT NULL AND btrim(organization) <> ''
),
matched AS (
    SELECT oi.organization
    FROM org_inputs oi
    WHERE EXISTS (
        SELECT 1 FROM external_ref.organization_master om
        WHERE lower(btrim(om.organization_name)) = lower(oi.organization)
           OR lower(btrim(om.organization_code)) = lower(oi.organization)
    )
)
SELECT
    (SELECT count(*) FROM org_inputs)::bigint AS org_input_count,
    (SELECT count(*) FROM matched)::bigint AS matched_org_count,
    CASE WHEN (SELECT count(*) FROM org_inputs) = 0 THEN NULL
         ELSE round(
             100.0 * (SELECT count(*) FROM matched) / (SELECT count(*) FROM org_inputs),
             2
         )
    END AS organization_match_rate_pct;

-- BQ-04: 지역코드 매핑 (job.workplace ↔ region_master.region_name)
CREATE OR REPLACE VIEW analytics.v_kpi_region_code_match_rate AS
WITH workplaces AS (
    SELECT DISTINCT lower(btrim(j.workplace)) AS workplace_key
    FROM job j
    WHERE j.workplace IS NOT NULL AND btrim(j.workplace) <> ''
),
matched AS (
    SELECT w.workplace_key
    FROM workplaces w
    WHERE EXISTS (
        SELECT 1 FROM external_ref.region_master r
        WHERE lower(btrim(r.region_name)) = w.workplace_key
           OR lower(btrim(r.region_code)) = w.workplace_key
    )
)
SELECT
    (SELECT count(*) FROM workplaces)::bigint AS workplace_count,
    (SELECT count(*) FROM matched)::bigint AS matched_region_count,
    CASE WHEN (SELECT count(*) FROM workplaces) = 0 THEN NULL
         ELSE round(
             100.0 * (SELECT count(*) FROM matched) / (SELECT count(*) FROM workplaces),
             2
         )
    END AS region_code_match_rate_pct;

-- BQ-05: 외부 데이터 신선도
CREATE OR REPLACE VIEW analytics.v_kpi_external_data_freshness AS
SELECT
    sc.source_name,
    r.ingestion_run_id,
    r.idempotency_key,
    r.status,
    r.source_updated_at,
    r.finished_at AS collected_at,
    CASE
        WHEN r.source_updated_at IS NOT NULL THEN
            extract(epoch FROM (now() - r.source_updated_at)) / 3600.0
        WHEN r.finished_at IS NOT NULL THEN
            extract(epoch FROM (now() - r.finished_at)) / 3600.0
        ELSE NULL
    END AS freshness_hours
FROM external_ref.external_ingestion_run r
JOIN external_ref.source_catalog sc ON sc.source_id = r.source_id;

-- BQ-05: DQ pass rate
CREATE OR REPLACE VIEW analytics.v_kpi_external_dq_pass_rate AS
SELECT
    r.ingestion_run_id,
    sc.source_name,
    r.idempotency_key,
    count(*)::bigint AS dq_check_count,
    count(*) FILTER (WHERE dq.status = 'PASS')::bigint AS pass_count,
    count(*) FILTER (WHERE dq.status = 'FAIL')::bigint AS fail_count,
    CASE WHEN count(*) = 0 THEN NULL
         ELSE round(100.0 * count(*) FILTER (WHERE dq.status = 'PASS') / count(*), 2)
    END AS dq_pass_rate_pct
FROM external_ref.external_ingestion_run r
JOIN external_ref.source_catalog sc ON sc.source_id = r.source_id
LEFT JOIN external_ref.dq_check_result dq ON dq.ingestion_run_id = r.ingestion_run_id
GROUP BY r.ingestion_run_id, sc.source_name, r.idempotency_key;

-- BQ-06: KOSIS Context coverage (집단 Context only — 개인 score 금지)
CREATE OR REPLACE VIEW analytics.v_kpi_context_coverage AS
WITH periods AS (
    SELECT DISTINCT reference_period
    FROM external_ref.elderly_employment_snapshot
),
region_base AS (
    SELECT count(DISTINCT region_code)::bigint AS region_count
    FROM external_ref.region_master
),
covered AS (
    SELECT
        e.reference_period,
        count(DISTINCT e.region_code)::bigint AS context_region_count
    FROM external_ref.elderly_employment_snapshot e
    GROUP BY e.reference_period
)
SELECT
    c.reference_period,
    rb.region_count AS region_master_count,
    c.context_region_count,
    CASE WHEN rb.region_count = 0 THEN NULL
         ELSE round(100.0 * c.context_region_count / rb.region_count, 2)
    END AS context_coverage_pct
FROM covered c
CROSS JOIN region_base rb;

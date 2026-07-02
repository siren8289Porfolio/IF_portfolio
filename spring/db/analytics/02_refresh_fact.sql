-- =============================================================================
-- 10. 증분 적재 — fact_assessment (updated_at 기준 변경분만)
--    전체 재처리 대신 source_updated_at > 마지막 적재 시점 이후만 UPSERT
-- =============================================================================

-- dim_date 시드 (평가에 쓰인 날짜만 lazy insert)
INSERT INTO analytics.dim_date (date_id, full_date, year, quarter, month, day)
SELECT DISTINCT
    (EXTRACT(YEAR FROM d.full_date)::int * 10000
     + EXTRACT(MONTH FROM d.full_date)::int * 100
     + EXTRACT(DAY FROM d.full_date)::int)                          AS date_id,
    d.full_date,
    EXTRACT(YEAR FROM d.full_date)::smallint,
    EXTRACT(QUARTER FROM d.full_date)::smallint,
    EXTRACT(MONTH FROM d.full_date)::smallint,
    EXTRACT(DAY FROM d.full_date)::smallint
FROM (
    SELECT (a.assessed_at AT TIME ZONE 'UTC')::date AS full_date
    FROM assessment a
    WHERE a.assessed_at IS NOT NULL
) d
ON CONFLICT (full_date) DO NOTHING;

-- dim_job 스냅샷 upsert
INSERT INTO analytics.dim_job (job_id, job_title, workplace, work_hours, loaded_at)
SELECT j.job_id, j.job_title, j.workplace, j.work_hours, now()
FROM job j
ON CONFLICT (job_id) DO UPDATE SET
    job_title   = EXCLUDED.job_title,
    workplace   = EXCLUDED.workplace,
    work_hours  = EXCLUDED.work_hours,
    loaded_at   = now();

-- dim_applicant 스냅샷 upsert
INSERT INTO analytics.dim_applicant (applicant_id, display_name, age, loaded_at)
SELECT ap.applicant_id, ap.display_name, ap.age, now()
FROM applicant ap
ON CONFLICT (applicant_id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    age          = EXCLUDED.age,
    loaded_at    = now();

-- fact 증분 upsert (마지막 적재 이후 변경분)
INSERT INTO analytics.fact_assessment (
    assessment_id, date_id, job_id, applicant_id, status,
    total_risk_percent, risk_grade, physical_level,
    assessed_at, source_updated_at, loaded_at
)
SELECT
    a.assessment_id,
    (EXTRACT(YEAR FROM (a.assessed_at AT TIME ZONE 'UTC')::date)::int * 10000
     + EXTRACT(MONTH FROM (a.assessed_at AT TIME ZONE 'UTC')::date)::int * 100
     + EXTRACT(DAY FROM (a.assessed_at AT TIME ZONE 'UTC')::date)::int),
    a.job_id,
    a.applicant_id,
    a.status,
    r.total_risk_percent,
    r.risk_grade,
    h.physical_level,
    a.assessed_at,
    a.updated_at,
    now()
FROM assessment a
JOIN health_snapshot h ON h.health_id = a.health_id
LEFT JOIN ai_risk_result r ON r.ai_result_id = a.ai_result_id
WHERE a.updated_at > COALESCE(
    (SELECT max(source_updated_at) FROM analytics.fact_assessment),
    '1970-01-01'::timestamptz
)
ON CONFLICT (assessment_id) DO UPDATE SET
    date_id            = EXCLUDED.date_id,
    job_id             = EXCLUDED.job_id,
    applicant_id       = EXCLUDED.applicant_id,
    status             = EXCLUDED.status,
    total_risk_percent = EXCLUDED.total_risk_percent,
    risk_grade         = EXCLUDED.risk_grade,
    physical_level     = EXCLUDED.physical_level,
    assessed_at        = EXCLUDED.assessed_at,
    source_updated_at  = EXCLUDED.source_updated_at,
    loaded_at          = now();

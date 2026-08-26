-- =============================================================================
-- 13. 데이터 품질 테스트 (dbt generic test 개념을 SQL로 구현)
--    실패 시 psql exit code 1 → CI/배치 파이프라인에서 차단 가능
-- =============================================================================

\set ON_ERROR_STOP on

\echo '=== 품질 검사 시작 ==='

-- PK 중복 없음
DO $$
DECLARE dup BIGINT;
BEGIN
    SELECT count(*) INTO dup FROM (
        SELECT assessment_id FROM assessment GROUP BY assessment_id HAVING count(*) > 1
    ) t;
    IF dup > 0 THEN RAISE EXCEPTION 'FAIL: assessment PK 중복 %건', dup; END IF;
END $$;

-- 필수값 NOT NULL
DO $$
DECLARE n BIGINT;
BEGIN
    SELECT count(*) INTO n FROM assessment WHERE status IS NULL;
    IF n > 0 THEN RAISE EXCEPTION 'FAIL: assessment.status NULL %건', n; END IF;

    SELECT count(*) INTO n FROM assessment WHERE applicant_id IS NULL OR job_id IS NULL OR health_id IS NULL;
    IF n > 0 THEN RAISE EXCEPTION 'FAIL: assessment FK 필수값 NULL %건', n; END IF;
END $$;

-- 상태값 허용 범위
DO $$
DECLARE n BIGINT;
BEGIN
    SELECT count(*) INTO n FROM assessment
    WHERE status NOT IN ('PENDING_AI', 'AI_COMPLETED', 'FINALIZED');
    IF n > 0 THEN RAISE EXCEPTION 'FAIL: assessment.status 허용값 위반 %건', n; END IF;
END $$;

-- risk_grade 허용 범위
DO $$
DECLARE n BIGINT;
BEGIN
    SELECT count(*) INTO n FROM ai_risk_result
    WHERE risk_grade IS NOT NULL AND risk_grade NOT IN ('LOW', 'MID', 'HIGH');
    IF n > 0 THEN RAISE EXCEPTION 'FAIL: risk_grade 허용값 위반 %건', n; END IF;
END $$;

-- FK 관계: health_snapshot → applicant
DO $$
DECLARE n BIGINT;
BEGIN
    SELECT count(*) INTO n
    FROM health_snapshot h
    LEFT JOIN applicant a ON a.applicant_id = h.applicant_id
    WHERE a.applicant_id IS NULL;
    IF n > 0 THEN RAISE EXCEPTION 'FAIL: health_snapshot 고아 FK %건', n; END IF;
END $$;

-- physical_level 범위
DO $$
DECLARE n BIGINT;
BEGIN
    SELECT count(*) INTO n FROM health_snapshot
    WHERE physical_level IS NOT NULL AND (physical_level < 1 OR physical_level > 5);
    IF n > 0 THEN RAISE EXCEPTION 'FAIL: physical_level 범위 위반 %건', n; END IF;
END $$;

-- row count 급감 검사 (이전 실행 대비 50% 미만이면 경고 — pipeline_run_log 기준)
DO $$
DECLARE prev BIGINT; curr BIGINT;
BEGIN
    SELECT processed_row_count INTO prev
    FROM pipeline_run_log
    WHERE job_name = 'refresh_fact' AND status = 'SUCCESS'
    ORDER BY finished_at DESC LIMIT 1;

    SELECT count(*) INTO curr FROM analytics.fact_assessment;

    IF prev IS NOT NULL AND prev > 0 AND curr < prev * 0.5 THEN
        RAISE EXCEPTION 'FAIL: fact_assessment row count 급감 (이전 % → 현재 %)', prev, curr;
    END IF;
END $$;

\echo '=== 품질 검사 통과 ==='

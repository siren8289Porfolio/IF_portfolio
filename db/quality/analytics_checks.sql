-- =============================================================================
-- DA-02 / DA-04 — Analytics grain · governance 가드
-- KOSIS/external aggregate는 개인 score/grade를 바꾸지 않는다.
-- =============================================================================

\set ON_ERROR_STOP on

\echo '=== Analytics grain / governance 검사 시작 ==='

-- Fact grain: assessment_id 유일
DO $$
DECLARE dup BIGINT;
BEGIN
    SELECT count(*) INTO dup FROM (
        SELECT assessment_id
        FROM analytics.fact_assessment
        GROUP BY assessment_id
        HAVING count(*) > 1
    ) t;
    IF dup > 0 THEN
        RAISE EXCEPTION 'FAIL: fact_assessment assessment_id grain 위반 %건', dup;
    END IF;
END $$;

-- Fact ↔ 운영 assessment 정합성 (고아 fact 없음)
DO $$
DECLARE n BIGINT;
BEGIN
    SELECT count(*) INTO n
    FROM analytics.fact_assessment f
    LEFT JOIN assessment a ON a.assessment_id = f.assessment_id
    WHERE a.assessment_id IS NULL;
    IF n > 0 THEN
        RAISE EXCEPTION 'FAIL: fact_assessment 고아 assessment_id %건', n;
    END IF;
END $$;

-- risk_grade는 허용 코드만 (NULL 허용 — AI 미완료)
DO $$
DECLARE n BIGINT;
BEGIN
    SELECT count(*) INTO n
    FROM analytics.fact_assessment f
    WHERE f.risk_grade IS NOT NULL
      AND NOT EXISTS (
          SELECT 1 FROM analytics.dim_risk_grade d WHERE d.risk_grade = f.risk_grade
      );
    IF n > 0 THEN
        RAISE EXCEPTION 'FAIL: fact_assessment risk_grade 미등록 코드 %건', n;
    END IF;
END $$;

-- KOSIS Context grain: reference_period × region × age_group × metric
DO $$
DECLARE dup BIGINT;
BEGIN
    SELECT count(*) INTO dup FROM (
        SELECT reference_period, region_code, age_group, metric, source_name
        FROM external_ref.elderly_employment_snapshot
        GROUP BY reference_period, region_code, age_group, metric, source_name
        HAVING count(*) > 1
    ) t;
    IF dup > 0 THEN
        RAISE EXCEPTION 'FAIL: elderly_employment_snapshot grain 중복 %건', dup;
    END IF;
END $$;

-- Governance: fact에 KOSIS metric을 직접 붙이는 컬럼이 생기면 안 됨
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'analytics'
          AND table_name = 'fact_assessment'
          AND column_name IN (
              'kosis_metric_value',
              'employment_probability',
              'cohort_adjusted_score',
              'external_score_delta'
          )
    ) THEN
        RAISE EXCEPTION 'FAIL: fact_assessment에 개인 판정용 외부통계 컬럼이 존재함 (DA-04 금지)';
    END IF;
END $$;

-- KPI 정의 카탈로그 존재
DO $$
DECLARE n BIGINT;
BEGIN
    SELECT count(*) INTO n FROM analytics.kpi_definition;
    IF n < 1 THEN
        RAISE EXCEPTION 'FAIL: analytics.kpi_definition 비어 있음';
    END IF;
END $$;

\echo '=== Analytics grain / governance 검사 통과 ==='

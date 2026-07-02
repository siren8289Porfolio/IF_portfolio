-- =============================================================================
-- 9. Materialized View — 대시보드 집계 (매번 COUNT 3번 대신 미리 계산)
--    REFRESH: db/pipeline/refresh_summary.sql
-- =============================================================================

DROP MATERIALIZED VIEW IF EXISTS mv_assessment_dashboard_summary;

CREATE MATERIALIZED VIEW mv_assessment_dashboard_summary AS
SELECT
    1::smallint                                                         AS summary_id,
    count(*)::bigint                                                    AS total_count,
    count(*) FILTER (WHERE a.status = 'FINALIZED')::bigint              AS finalized_count,
    count(*) FILTER (WHERE r.risk_grade = 'HIGH')::bigint               AS high_risk_count,
    count(*) FILTER (WHERE a.status = 'PENDING_AI')::bigint             AS pending_count,
    count(*) FILTER (WHERE a.status = 'AI_COMPLETED')::bigint           AS analyzed_count,
    max(a.assessed_at)                                                  AS latest_assessed_at,
    now()                                                               AS refreshed_at
FROM assessment a
LEFT JOIN ai_risk_result r ON r.ai_result_id = a.ai_result_id
WITH NO DATA;

CREATE UNIQUE INDEX IF NOT EXISTS uk_mv_assessment_dashboard_summary
    ON mv_assessment_dashboard_summary (summary_id);

REFRESH MATERIALIZED VIEW mv_assessment_dashboard_summary;

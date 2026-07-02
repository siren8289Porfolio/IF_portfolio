-- 데이터 효율화 검증 (로드맵 0, 3)
-- 사용법: cd spring && PGPASSWORD=change-me psql -h localhost -U if_user -d if_spring -f db/verify-db-efficiency.sql

\echo '=== 운영 테이블·인덱스 ==='
\dt public.*
\di public.*

\echo ''
\echo '=== 분석 스키마 (Star Schema) ==='
\dt analytics.*

\echo ''
\echo '=== Materialized View ==='
\d mv_assessment_dashboard_summary

\echo ''
\echo '=== 1) 대시보드 목록: ORDER BY assessed_at DESC LIMIT 50 ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT assessment_id, applicant_id, status, assessed_at
FROM assessment ORDER BY assessed_at DESC LIMIT 50;

\echo ''
\echo '=== 2) 신청자별 이력 (복합 인덱스) ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT assessment_id, status, assessed_at
FROM assessment
WHERE applicant_id = (SELECT COALESCE(min(applicant_id), 0) FROM assessment)
ORDER BY assessed_at DESC;

\echo ''
\echo '=== 3) 고위험군 partial index ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT count(*) FROM assessment a
JOIN ai_risk_result r ON r.ai_result_id = a.ai_result_id
WHERE r.risk_grade = 'HIGH';

\echo ''
\echo '=== 4) 분석 fact — status 필터 ==='
EXPLAIN (ANALYZE, BUFFERS)
SELECT count(*) FROM analytics.fact_assessment WHERE status = 'FINALIZED';

\echo ''
\echo '=== 5) MV vs COUNT 비교 ==='
SELECT 'mv' AS src, total_count, finalized_count, high_risk_count
FROM mv_assessment_dashboard_summary
UNION ALL
SELECT 'live', count(*)::bigint,
       count(*) FILTER (WHERE status = 'FINALIZED')::bigint,
       count(*) FILTER (WHERE EXISTS (
           SELECT 1 FROM ai_risk_result r
           WHERE r.ai_result_id = assessment.ai_result_id AND r.risk_grade = 'HIGH'
       ))::bigint
FROM assessment;

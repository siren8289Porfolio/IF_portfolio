-- =============================================================================
-- 5~6. 인덱스 + Partial Index (조회 패턴별)
-- =============================================================================

-- applicant
CREATE INDEX IF NOT EXISTS idx_applicant_created_at
    ON applicant (created_at DESC);

-- health_snapshot
CREATE INDEX IF NOT EXISTS idx_health_snapshot_applicant
    ON health_snapshot (applicant_id);

-- job
CREATE INDEX IF NOT EXISTS idx_job_title
    ON job (job_title);

-- assessment — 대시보드·이력·상태 필터
CREATE INDEX IF NOT EXISTS idx_assessment_assessed_at
    ON assessment (assessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_assessment_status
    ON assessment (status);

CREATE INDEX IF NOT EXISTS idx_assessment_applicant_assessed_at
    ON assessment (applicant_id, assessed_at DESC);

CREATE INDEX IF NOT EXISTS idx_assessment_updated_at
    ON assessment (updated_at);          -- 증분 처리용 (로드맵 10)

-- assessment: health_id / ai_result_id 유니크 (JPA @OneToOne)
CREATE UNIQUE INDEX IF NOT EXISTS uk_assessment_health_id
    ON assessment (health_id);

CREATE UNIQUE INDEX IF NOT EXISTS uk_assessment_ai_result_id
    ON assessment (ai_result_id)
    WHERE ai_result_id IS NOT NULL;

-- ai_risk_result
CREATE INDEX IF NOT EXISTS idx_ai_risk_result_assessment
    ON ai_risk_result (assessment_id);

CREATE INDEX IF NOT EXISTS idx_ai_risk_result_generated_at
    ON ai_risk_result (generated_at DESC);

-- Partial index: HIGH 등급만 자주 집계 (로드맵 6)
CREATE INDEX IF NOT EXISTS idx_ai_risk_result_high
    ON ai_risk_result (risk_grade)
    WHERE risk_grade = 'HIGH';

CREATE INDEX IF NOT EXISTS idx_ai_risk_result_updated_at
    ON ai_risk_result (updated_at);

-- pipeline_run_log
CREATE INDEX IF NOT EXISTS idx_pipeline_run_log_job_started
    ON pipeline_run_log (job_name, started_at DESC);

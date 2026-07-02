-- =============================================================================
-- PK/FK/상태값 제약 보완 (순환 FK: assessment ↔ ai_risk_result)
-- =============================================================================

-- assessment.status 허용값 (JPA AssessmentStatus enum)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'assessment_status_check'
    ) THEN
        ALTER TABLE assessment
            ADD CONSTRAINT assessment_status_check
            CHECK (status IN ('PENDING_AI', 'AI_COMPLETED', 'FINALIZED'));
    END IF;
END $$;

-- 순환 FK: ai_risk_result → assessment 먼저, assessment → ai_risk_result 나중
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_ai_risk_result_assessment'
    ) THEN
        ALTER TABLE ai_risk_result
            ADD CONSTRAINT fk_ai_risk_result_assessment
            FOREIGN KEY (assessment_id) REFERENCES assessment(assessment_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_assessment_ai_result'
    ) THEN
        ALTER TABLE assessment
            ADD CONSTRAINT fk_assessment_ai_result
            FOREIGN KEY (ai_result_id) REFERENCES ai_risk_result(ai_result_id);
    END IF;
END $$;

-- updated_at 자동 갱신 트리거 (증분 처리 기준 컬럼)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_assessment_updated_at ON assessment;
CREATE TRIGGER trg_assessment_updated_at
    BEFORE UPDATE ON assessment
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_ai_risk_result_updated_at ON ai_risk_result;
CREATE TRIGGER trg_ai_risk_result_updated_at
    BEFORE UPDATE ON ai_risk_result
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

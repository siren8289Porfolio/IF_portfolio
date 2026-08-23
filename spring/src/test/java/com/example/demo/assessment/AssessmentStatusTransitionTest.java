package com.example.demo.assessment.entity;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AssessmentStatusTransitionTest {

    @Test
    void allowsPendingToAiCompleted() {
        assertTrue(AssessmentStatus.PENDING_AI.canTransitionTo(AssessmentStatus.AI_COMPLETED));
    }

    @Test
    void allowsAiCompletedToFinalized() {
        assertTrue(AssessmentStatus.AI_COMPLETED.canTransitionTo(AssessmentStatus.FINALIZED));
    }

    @Test
    void rejectsSkipAndBackward() {
        assertFalse(AssessmentStatus.PENDING_AI.canTransitionTo(AssessmentStatus.FINALIZED));
        assertFalse(AssessmentStatus.AI_COMPLETED.canTransitionTo(AssessmentStatus.PENDING_AI));
        assertFalse(AssessmentStatus.FINALIZED.canTransitionTo(AssessmentStatus.AI_COMPLETED));
        assertFalse(AssessmentStatus.FINALIZED.canTransitionTo(AssessmentStatus.PENDING_AI));
    }
}

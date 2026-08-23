package com.example.demo.qa;

import com.example.demo.ai.service.AIRiskService;
import com.example.demo.assessment.entity.AssessmentStatus;
import com.example.demo.global.exception.GlobalExceptionHandler;
import com.example.demo.global.response.ApiResponse;
import com.example.demo.global.response.ErrorResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * QA §8 고정 regression gate — 배포마다 통과해야 함.
 * 성능 P95·E2E는 NOT TESTED (QA.md).
 */
class QaRegressionGateTest {

    @Test
    void gradeBoundaries_pol002() {
        assertEquals("LOW", AIRiskService.gradeOf(40));
        assertEquals("MID", AIRiskService.gradeOf(41));
        assertEquals("HIGH", AIRiskService.gradeOf(61));
    }

    @Test
    void statusMachine_rejectsSkipToFinalized() {
        assertTrue(AssessmentStatus.PENDING_AI.canTransitionTo(AssessmentStatus.AI_COMPLETED));
        assertTrue(AssessmentStatus.AI_COMPLETED.canTransitionTo(AssessmentStatus.FINALIZED));
        assertFalse(AssessmentStatus.PENDING_AI.canTransitionTo(AssessmentStatus.FINALIZED));
    }

    @Test
    void internalError_doesNotEchoSecret() {
        GlobalExceptionHandler handler = new GlobalExceptionHandler();
        ResponseEntity<ApiResponse<ErrorResponse>> resp =
                handler.handleException(new RuntimeException("db-password=super-secret"));
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, resp.getStatusCode());
        assertEquals("INTERNAL_ERROR", resp.getBody().getErrorCode());
        assertEquals("An unexpected error occurred", resp.getBody().getMessage());
        assertFalse(resp.getBody().getMessage().contains("super-secret"));
    }
}

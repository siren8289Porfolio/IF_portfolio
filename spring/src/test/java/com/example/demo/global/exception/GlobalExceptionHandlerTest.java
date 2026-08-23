package com.example.demo.global.exception;

import com.example.demo.assessment.entity.AssessmentStatus;
import com.example.demo.global.response.ApiResponse;
import com.example.demo.global.response.ErrorResponse;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;

class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();

    @Test
    void mapsNotFound() {
        ResponseEntity<ApiResponse<ErrorResponse>> resp = handler.handleNotFound(new NotFoundException("missing"));
        assertEquals(HttpStatus.NOT_FOUND, resp.getStatusCode());
        assertFalse(resp.getBody().isSuccess());
        assertEquals("NOT_FOUND", resp.getBody().getErrorCode());
    }

    @Test
    void mapsInvalidStatusTransition() {
        ResponseEntity<ApiResponse<ErrorResponse>> resp = handler.handleInvalidStatusTransition(
                new InvalidStatusTransitionException(AssessmentStatus.PENDING_AI, AssessmentStatus.FINALIZED));
        assertEquals(HttpStatus.BAD_REQUEST, resp.getStatusCode());
        assertEquals("INVALID_STATUS_TRANSITION", resp.getBody().getErrorCode());
    }

    @Test
    void mapsAiTimeout() {
        ResponseEntity<ApiResponse<ErrorResponse>> resp =
                handler.handleAiTimeout(new AiServiceTimeoutException("timeout"));
        assertEquals(HttpStatus.GATEWAY_TIMEOUT, resp.getStatusCode());
        assertEquals("AI_SERVICE_TIMEOUT", resp.getBody().getErrorCode());
    }

    @Test
    void mapsAiUnavailable() {
        ResponseEntity<ApiResponse<ErrorResponse>> resp =
                handler.handleAiUnavailable(new AiServiceUnavailableException("down"));
        assertEquals(HttpStatus.BAD_GATEWAY, resp.getStatusCode());
        assertEquals("AI_SERVICE_UNAVAILABLE", resp.getBody().getErrorCode());
    }

    @Test
    void mapsInternalWithoutStackInMessage() {
        ResponseEntity<ApiResponse<ErrorResponse>> resp =
                handler.handleException(new RuntimeException("secret"));
        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, resp.getStatusCode());
        assertEquals("INTERNAL_ERROR", resp.getBody().getErrorCode());
        assertEquals("An unexpected error occurred", resp.getBody().getMessage());
    }
}

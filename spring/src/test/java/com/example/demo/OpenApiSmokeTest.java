package com.example.demo;

import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;

import java.nio.charset.StandardCharsets;

import static org.junit.jupiter.api.Assertions.assertTrue;

/** OpenAPI 경로 스모크 (전면 contract는 DESIGNED). */
class OpenApiSmokeTest {

    @Test
    void openApiDocumentsCoreAssessmentPaths() throws Exception {
        String yaml = new ClassPathResource("openapi.yml")
                .getContentAsString(StandardCharsets.UTF_8);
        assertTrue(yaml.contains("/api/assessments/{assessmentId}/compute-risk"));
        assertTrue(yaml.contains("/api/assessments/{assessmentId}/risk-detail"));
        assertTrue(yaml.contains("INVALID_STATUS_TRANSITION"));
        assertTrue(yaml.contains("AI_SERVICE_TIMEOUT"));
    }
}

package com.example.demo.assessment.dto;

/**
 * PATCH /api/assessments/{id} 요청 body.
 */
public class AssessmentUpdateRequest {
    private String status;

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
}

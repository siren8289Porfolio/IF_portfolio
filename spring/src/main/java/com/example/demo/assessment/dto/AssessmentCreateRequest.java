package com.example.demo.assessment.dto;

public class AssessmentCreateRequest {

    private Long jobId;
    private Long healthId;

    public Long getJobId() {
        return jobId;
    }

    public void setJobId(Long jobId) {
        this.jobId = jobId;
    }

    public Long getHealthId() {
        return healthId;
    }

    public void setHealthId(Long healthId) {
        this.healthId = healthId;
    }
}


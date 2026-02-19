package com.example.demo.applicant.dto;

import java.time.OffsetDateTime;

public class HealthSnapshotResponse {

    private Long id;
    private Long applicantId;
    private Integer physicalLevel;
    private Boolean chronicDiseaseFlag;
    private Integer workHourLimit;
    private OffsetDateTime createdAt;

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getApplicantId() {
        return applicantId;
    }

    public void setApplicantId(Long applicantId) {
        this.applicantId = applicantId;
    }

    public Integer getPhysicalLevel() {
        return physicalLevel;
    }

    public void setPhysicalLevel(Integer physicalLevel) {
        this.physicalLevel = physicalLevel;
    }

    public Boolean getChronicDiseaseFlag() {
        return chronicDiseaseFlag;
    }

    public void setChronicDiseaseFlag(Boolean chronicDiseaseFlag) {
        this.chronicDiseaseFlag = chronicDiseaseFlag;
    }

    public Integer getWorkHourLimit() {
        return workHourLimit;
    }

    public void setWorkHourLimit(Integer workHourLimit) {
        this.workHourLimit = workHourLimit;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(OffsetDateTime createdAt) {
        this.createdAt = createdAt;
    }
}

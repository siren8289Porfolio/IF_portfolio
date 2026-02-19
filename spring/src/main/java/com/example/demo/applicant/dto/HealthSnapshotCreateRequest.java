package com.example.demo.applicant.dto;

public class HealthSnapshotCreateRequest {

    /** 1~5 */
    private Integer physicalLevel;
    private Boolean chronicDiseaseFlag;
    private Integer workHourLimit;

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
}

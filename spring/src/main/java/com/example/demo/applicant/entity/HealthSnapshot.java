package com.example.demo.applicant.entity;

import jakarta.persistence.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "health_snapshot")
public class HealthSnapshot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "health_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "applicant_id")
    private Applicant applicant;

    /**
     * 1~5
     */
    @Column(name = "physical_level")
    private Integer physicalLevel;

    @Column(name = "chronic_disease_flag")
    private Boolean chronicDiseaseFlag;

    @Column(name = "work_hour_limit")
    private Integer workHourLimit;

    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    // getters/setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Applicant getApplicant() {
        return applicant;
    }

    public void setApplicant(Applicant applicant) {
        this.applicant = applicant;
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


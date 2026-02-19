package com.example.demo.ai.entity;

import com.example.demo.job.entity.Job;
import jakarta.persistence.*;

@Entity
@Table(name = "ai_job_risk_profile")
public class AIJobRiskProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ai_job_risk_id")
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "job_id")
    private Job job;

    @Column(name = "physical_load_score")
    private Integer physicalLoadScore;

    @Column(name = "repetition_score")
    private Integer repetitionScore;

    @Column(name = "accident_risk_score")
    private Integer accidentRiskScore;

    private String version;

    // getters/setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Job getJob() {
        return job;
    }

    public void setJob(Job job) {
        this.job = job;
    }

    public Integer getPhysicalLoadScore() {
        return physicalLoadScore;
    }

    public void setPhysicalLoadScore(Integer physicalLoadScore) {
        this.physicalLoadScore = physicalLoadScore;
    }

    public Integer getRepetitionScore() {
        return repetitionScore;
    }

    public void setRepetitionScore(Integer repetitionScore) {
        this.repetitionScore = repetitionScore;
    }

    public Integer getAccidentRiskScore() {
        return accidentRiskScore;
    }

    public void setAccidentRiskScore(Integer accidentRiskScore) {
        this.accidentRiskScore = accidentRiskScore;
    }

    public String getVersion() {
        return version;
    }

    public void setVersion(String version) {
        this.version = version;
    }
}


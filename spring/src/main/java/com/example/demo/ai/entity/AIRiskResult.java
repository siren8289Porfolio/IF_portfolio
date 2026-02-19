package com.example.demo.ai.entity;

import com.example.demo.assessment.entity.Assessment;
import jakarta.persistence.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "ai_risk_result")
public class AIRiskResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "ai_result_id")
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assessment_id")
    private Assessment assessment;

    @Column(name = "total_risk_percent")
    private Integer totalRiskPercent;

    @Column(name = "risk_grade")
    private String riskGrade; // LOW / MID / HIGH

    @Column(name = "generated_at")
    private OffsetDateTime generatedAt;

    @Column(name = "model_version")
    private String modelVersion;

    /** LLM 설명 JSON (summary, factor_explanations, guidance, disclaimer). */
    @Column(name = "explanation_json", columnDefinition = "text")
    private String explanationJson;

    // getters/setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Assessment getAssessment() {
        return assessment;
    }

    public void setAssessment(Assessment assessment) {
        this.assessment = assessment;
    }

    public Integer getTotalRiskPercent() {
        return totalRiskPercent;
    }

    public void setTotalRiskPercent(Integer totalRiskPercent) {
        this.totalRiskPercent = totalRiskPercent;
    }

    public String getRiskGrade() {
        return riskGrade;
    }

    public void setRiskGrade(String riskGrade) {
        this.riskGrade = riskGrade;
    }

    public OffsetDateTime getGeneratedAt() {
        return generatedAt;
    }

    public void setGeneratedAt(OffsetDateTime generatedAt) {
        this.generatedAt = generatedAt;
    }

    public String getModelVersion() {
        return modelVersion;
    }

    public void setModelVersion(String modelVersion) {
        this.modelVersion = modelVersion;
    }

    public String getExplanationJson() {
        return explanationJson;
    }

    public void setExplanationJson(String explanationJson) {
        this.explanationJson = explanationJson;
    }
}


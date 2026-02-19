package com.example.demo.ai.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "ai_risk_contribution")
public class AIRiskContribution {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "contribution_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "ai_result_id")
    private AIRiskResult aiResult;

    @Column(name = "factor_type")
    private String factorType; // physical / repetition / accident

    @Column(name = "contribution_percent")
    private Integer contributionPercent;

    // getters/setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public AIRiskResult getAiResult() {
        return aiResult;
    }

    public void setAiResult(AIRiskResult aiResult) {
        this.aiResult = aiResult;
    }

    public String getFactorType() {
        return factorType;
    }

    public void setFactorType(String factorType) {
        this.factorType = factorType;
    }

    public Integer getContributionPercent() {
        return contributionPercent;
    }

    public void setContributionPercent(Integer contributionPercent) {
        this.contributionPercent = contributionPercent;
    }
}


package com.example.demo.ai.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.ArrayList;
import java.util.List;

/**
 * FastAPI POST /score 응답 (snake_case).
 */
public class ScoreResponseDto {
    @JsonProperty("risk_score")
    private double riskScore;
    @JsonProperty("risk_band")
    private String riskBand;
    @JsonProperty("region_score")
    private double regionScore;
    @JsonProperty("rule_based_adjustment")
    private double ruleBasedAdjustment;
    @JsonProperty("top_factors")
    private List<ScoreFactorDto> topFactors = new ArrayList<>();

    public double getRiskScore() { return riskScore; }
    public void setRiskScore(double riskScore) { this.riskScore = riskScore; }
    public String getRiskBand() { return riskBand; }
    public void setRiskBand(String riskBand) { this.riskBand = riskBand; }
    public double getRegionScore() { return regionScore; }
    public void setRegionScore(double regionScore) { this.regionScore = regionScore; }
    public double getRuleBasedAdjustment() { return ruleBasedAdjustment; }
    public void setRuleBasedAdjustment(double ruleBasedAdjustment) { this.ruleBasedAdjustment = ruleBasedAdjustment; }
    public List<ScoreFactorDto> getTopFactors() { return topFactors; }
    public void setTopFactors(List<ScoreFactorDto> topFactors) { this.topFactors = topFactors != null ? topFactors : new ArrayList<>(); }
}

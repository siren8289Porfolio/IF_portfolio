package com.example.demo.ai.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.ArrayList;
import java.util.List;

/**
 * FastAPI POST /explain 요청 body (snake_case).
 */
public class ExplainRequestDto {
    @JsonProperty("risk_score")
    private double riskScore;
    @JsonProperty("risk_band")
    private String riskBand;
    @JsonProperty("top_factors")
    private List<ScoreFactorDto> topFactors = new ArrayList<>();
    @JsonProperty("case_summary")
    private String caseSummary;

    public double getRiskScore() { return riskScore; }
    public void setRiskScore(double riskScore) { this.riskScore = riskScore; }
    public String getRiskBand() { return riskBand; }
    public void setRiskBand(String riskBand) { this.riskBand = riskBand; }
    public List<ScoreFactorDto> getTopFactors() { return topFactors; }
    public void setTopFactors(List<ScoreFactorDto> topFactors) { this.topFactors = topFactors != null ? topFactors : new ArrayList<>(); }
    public String getCaseSummary() { return caseSummary; }
    public void setCaseSummary(String caseSummary) { this.caseSummary = caseSummary; }
}

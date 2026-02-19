package com.example.demo.ai.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.ArrayList;
import java.util.List;

/**
 * FastAPI POST /explain 응답 (snake_case).
 */
public class ExplainResponseDto {
    private String summary;
    @JsonProperty("factor_explanations")
    private List<FactorExplanationDto> factorExplanations = new ArrayList<>();
    private String guidance;
    private String disclaimer;

    public String getSummary() { return summary; }
    public void setSummary(String summary) { this.summary = summary; }
    public List<FactorExplanationDto> getFactorExplanations() { return factorExplanations; }
    public void setFactorExplanations(List<FactorExplanationDto> factorExplanations) { this.factorExplanations = factorExplanations != null ? factorExplanations : new ArrayList<>(); }
    public String getGuidance() { return guidance; }
    public void setGuidance(String guidance) { this.guidance = guidance; }
    public String getDisclaimer() { return disclaimer; }
    public void setDisclaimer(String disclaimer) { this.disclaimer = disclaimer; }
}

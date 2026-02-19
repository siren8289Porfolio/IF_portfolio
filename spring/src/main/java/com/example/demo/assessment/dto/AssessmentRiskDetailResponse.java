package com.example.demo.assessment.dto;

import java.util.ArrayList;
import java.util.List;

/**
 * 특정 assessment에 대한 AI 위험도 상세 응답 DTO.
 */
public class AssessmentRiskDetailResponse {

    private Integer riskScore;          // 0~100 점수
    private String riskBand;           // 낮음/보통/높음/매우 높음
    private String riskGrade;          // LOW/MID/HIGH
    private String summary;            // LLM 요약
    private List<String> factorSummaries = new ArrayList<>(); // "요인: 설명" 문자열 리스트
    private String guidance;           // 해석 가이드
    private String disclaimer;         // 면책 문구

    public Integer getRiskScore() {
        return riskScore;
    }

    public void setRiskScore(Integer riskScore) {
        this.riskScore = riskScore;
    }

    public String getRiskBand() {
        return riskBand;
    }

    public void setRiskBand(String riskBand) {
        this.riskBand = riskBand;
    }

    public String getRiskGrade() {
        return riskGrade;
    }

    public void setRiskGrade(String riskGrade) {
        this.riskGrade = riskGrade;
    }

    public String getSummary() {
        return summary;
    }

    public void setSummary(String summary) {
        this.summary = summary;
    }

    public List<String> getFactorSummaries() {
        return factorSummaries;
    }

    public void setFactorSummaries(List<String> factorSummaries) {
        this.factorSummaries = factorSummaries != null ? factorSummaries : new ArrayList<>();
    }

    public String getGuidance() {
        return guidance;
    }

    public void setGuidance(String guidance) {
        this.guidance = guidance;
    }

    public String getDisclaimer() {
        return disclaimer;
    }

    public void setDisclaimer(String disclaimer) {
        this.disclaimer = disclaimer;
    }
}


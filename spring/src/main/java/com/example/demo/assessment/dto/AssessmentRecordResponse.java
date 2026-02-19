package com.example.demo.assessment.dto;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * 앱 "기록 목록"용 DTO. 웹에서 추가한 assessment가 앱에 보이도록.
 */
public class AssessmentRecordResponse {

    private Long id;
    private String applicantName;
    private Integer age;
    private String jobTitle;
    private String physicalLevel;  // "1"~"5" 등
    private Integer riskScore;     // AI 결과 있으면 (0-100), 없으면 null
    private OffsetDateTime assessedAt;
    private List<JobMatchDto> jobMatches = new ArrayList<>();

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getApplicantName() { return applicantName; }
    public void setApplicantName(String applicantName) { this.applicantName = applicantName; }
    public Integer getAge() { return age; }
    public void setAge(Integer age) { this.age = age; }
    public String getJobTitle() { return jobTitle; }
    public void setJobTitle(String jobTitle) { this.jobTitle = jobTitle; }
    public String getPhysicalLevel() { return physicalLevel; }
    public void setPhysicalLevel(String physicalLevel) { this.physicalLevel = physicalLevel; }
    public Integer getRiskScore() { return riskScore; }
    public void setRiskScore(Integer riskScore) { this.riskScore = riskScore; }
    public OffsetDateTime getAssessedAt() { return assessedAt; }
    public void setAssessedAt(OffsetDateTime assessedAt) { this.assessedAt = assessedAt; }
    public List<JobMatchDto> getJobMatches() { return jobMatches; }
    public void setJobMatches(List<JobMatchDto> jobMatches) { this.jobMatches = jobMatches != null ? jobMatches : new ArrayList<>(); }
}

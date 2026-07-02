package com.example.demo.assessment.dto;

import com.example.demo.assessment.entity.AssessmentStatus;

import java.time.OffsetDateTime;

/**
 * 평가 기록 목록 조회용 DTO (대시보드).
 *
 * {@link com.example.demo.assessment.repository.AssessmentRepository#findAllRecords}에서
 * JPQL 생성자 표현식({@code new ...AssessmentRecordResponse(...)})으로 바로 채워진다.
 * entity 전체를 fetch join하는 대신 화면에 필요한 컬럼만 SELECT해서 불필요한 I/O를 줄인다
 * (description/work_hours/explanation_json 등 미사용 컬럼은 조회하지 않음).
 */
public class AssessmentRecordResponse {

    private Long id;
    private String applicantName;
    private Integer age;
    private String jobTitle;
    private String physicalLevel;  // "1"~"5" 등
    private String status;         // PENDING_AI / AI_COMPLETED / FINALIZED
    private Integer riskScore;     // AI 결과 있으면 (0-100), 없으면 null
    private String riskGrade;      // AI 결과 있으면 LOW/MID/HIGH, 없으면 null
    private OffsetDateTime assessedAt;

    public AssessmentRecordResponse() {
    }

    public AssessmentRecordResponse(Long id, String applicantName, Integer age, String jobTitle,
                                     Integer physicalLevel, AssessmentStatus status,
                                     Integer riskScore, String riskGrade, OffsetDateTime assessedAt) {
        this.id = id;
        this.applicantName = applicantName;
        this.age = age;
        this.jobTitle = jobTitle;
        this.physicalLevel = physicalLevel != null ? String.valueOf(physicalLevel) : null;
        this.status = status != null ? status.name() : null;
        this.riskScore = riskScore;
        this.riskGrade = riskGrade;
        this.assessedAt = assessedAt;
    }

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
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Integer getRiskScore() { return riskScore; }
    public void setRiskScore(Integer riskScore) { this.riskScore = riskScore; }
    public String getRiskGrade() { return riskGrade; }
    public void setRiskGrade(String riskGrade) { this.riskGrade = riskGrade; }
    public OffsetDateTime getAssessedAt() { return assessedAt; }
    public void setAssessedAt(OffsetDateTime assessedAt) { this.assessedAt = assessedAt; }
}

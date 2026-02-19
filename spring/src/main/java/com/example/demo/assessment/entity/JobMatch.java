package com.example.demo.assessment.entity;

import jakarta.persistence.*;

import java.time.OffsetDateTime;

/**
 * 웹에서 입력한 일자리 매칭. 앱에 전달해 표시.
 */
@Entity
@Table(name = "job_match")
public class JobMatch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "job_match_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "assessment_id")
    private Assessment assessment;

    @Column(name = "job_name", nullable = false)
    private String jobName;

    @Column(name = "location")
    private String location;

    @Column(name = "time")
    private String time;

    /** 요일: "월,화,수" 형태 */
    @Column(name = "work_days", length = 100)
    private String workDays;

    @Column(name = "description", length = 2000)
    private String description;

    @Column(name = "matched_at")
    private OffsetDateTime matchedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Assessment getAssessment() { return assessment; }
    public void setAssessment(Assessment assessment) { this.assessment = assessment; }
    public String getJobName() { return jobName; }
    public void setJobName(String jobName) { this.jobName = jobName; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public String getTime() { return time; }
    public void setTime(String time) { this.time = time; }
    public String getWorkDays() { return workDays; }
    public void setWorkDays(String workDays) { this.workDays = workDays; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public OffsetDateTime getMatchedAt() { return matchedAt; }
    public void setMatchedAt(OffsetDateTime matchedAt) { this.matchedAt = matchedAt; }
}

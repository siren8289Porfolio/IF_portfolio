package com.example.demo.assessment.dto;

import java.time.OffsetDateTime;
import java.util.List;

/** 앱/웹에서 쓰는 매칭 일자리 한 건 */
public class JobMatchDto {

    private Long id;
    private String jobName;
    private String location;
    private String time;
    private List<String> workDays;
    private String description;
    private OffsetDateTime matchedAt;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getJobName() { return jobName; }
    public void setJobName(String jobName) { this.jobName = jobName; }
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    public String getTime() { return time; }
    public void setTime(String time) { this.time = time; }
    public List<String> getWorkDays() { return workDays; }
    public void setWorkDays(List<String> workDays) { this.workDays = workDays; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public OffsetDateTime getMatchedAt() { return matchedAt; }
    public void setMatchedAt(OffsetDateTime matchedAt) { this.matchedAt = matchedAt; }
}

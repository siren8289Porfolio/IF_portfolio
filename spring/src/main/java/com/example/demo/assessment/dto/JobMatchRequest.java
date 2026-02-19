package com.example.demo.assessment.dto;

import java.util.List;

/** 웹에서 매칭 저장 시 한 건 요청 */
public class JobMatchRequest {

    private String jobName;
    private String location;
    private String time;
    private List<String> workDays;
    private String description;

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
}

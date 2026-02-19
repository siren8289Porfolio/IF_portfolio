package com.example.demo.ai.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

import java.util.ArrayList;
import java.util.List;

/**
 * FastAPI POST /score 요청 body (snake_case).
 * work_intensity 누락 시 FastAPI가 physical_level(1~5)로 보정 가능.
 */
public class ScoreRequestDto {
    @JsonProperty("age_band")
    private String ageBand;
    private String region;
    @JsonProperty("job_category")
    private String jobCategory;
    @JsonProperty("work_intensity")
    private String workIntensity;
    @JsonProperty("physical_level")
    private Integer physicalLevel;
    @JsonProperty("environment_flags")
    private List<String> environmentFlags = new ArrayList<>();
    @JsonProperty("health_flags")
    private List<String> healthFlags = new ArrayList<>();

    public String getAgeBand() { return ageBand; }
    public void setAgeBand(String ageBand) { this.ageBand = ageBand; }
    public String getRegion() { return region; }
    public void setRegion(String region) { this.region = region; }
    public String getJobCategory() { return jobCategory; }
    public void setJobCategory(String jobCategory) { this.jobCategory = jobCategory; }
    public String getWorkIntensity() { return workIntensity; }
    public void setWorkIntensity(String workIntensity) { this.workIntensity = workIntensity; }
    public Integer getPhysicalLevel() { return physicalLevel; }
    public void setPhysicalLevel(Integer physicalLevel) { this.physicalLevel = physicalLevel; }
    public List<String> getEnvironmentFlags() { return environmentFlags; }
    public void setEnvironmentFlags(List<String> environmentFlags) { this.environmentFlags = environmentFlags != null ? environmentFlags : new ArrayList<>(); }
    public List<String> getHealthFlags() { return healthFlags; }
    public void setHealthFlags(List<String> healthFlags) { this.healthFlags = healthFlags != null ? healthFlags : new ArrayList<>(); }
}

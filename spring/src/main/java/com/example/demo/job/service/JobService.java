package com.example.demo.job.service;

import com.example.demo.job.dto.JobResponse;
import com.example.demo.job.entity.Job;
import com.example.demo.job.repository.JobRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class JobService {

    private final JobRepository jobRepository;

    public JobService(JobRepository jobRepository) {
        this.jobRepository = jobRepository;
    }

    public List<JobResponse> listJobs() {
        return jobRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    private JobResponse toResponse(Job job) {
        JobResponse r = new JobResponse();
        r.setId(job.getId());
        r.setJobTitle(job.getJobTitle());
        r.setWorkplace(job.getWorkplace());
        r.setWorkHours(job.getWorkHours());
        r.setDescription(job.getDescription());
        r.setCreatedAt(job.getCreatedAt());
        return r;
    }
}


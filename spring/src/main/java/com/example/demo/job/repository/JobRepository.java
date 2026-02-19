package com.example.demo.job.repository;

import com.example.demo.job.entity.Job;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JobRepository extends JpaRepository<Job, Long> {
}


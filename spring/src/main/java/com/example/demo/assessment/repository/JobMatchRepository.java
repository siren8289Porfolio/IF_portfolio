package com.example.demo.assessment.repository;

import com.example.demo.assessment.entity.JobMatch;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface JobMatchRepository extends JpaRepository<JobMatch, Long> {

    List<JobMatch> findByAssessment_IdOrderByMatchedAtDesc(Long assessmentId);

    void deleteByAssessment_Id(Long assessmentId);
}

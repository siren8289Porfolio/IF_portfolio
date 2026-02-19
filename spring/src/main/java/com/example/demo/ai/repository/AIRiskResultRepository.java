package com.example.demo.ai.repository;

import com.example.demo.ai.entity.AIRiskResult;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AIRiskResultRepository extends JpaRepository<AIRiskResult, Long> {
    Optional<AIRiskResult> findByAssessment_Id(Long assessmentId);
}


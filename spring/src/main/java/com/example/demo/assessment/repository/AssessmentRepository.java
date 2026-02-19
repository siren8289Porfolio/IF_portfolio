package com.example.demo.assessment.repository;

import com.example.demo.assessment.entity.Assessment;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AssessmentRepository extends JpaRepository<Assessment, Long> {

    List<Assessment> findByApplicant_IdOrderByAssessedAtDesc(Long applicantId);

    List<Assessment> findAllByOrderByAssessedAtDesc();
}


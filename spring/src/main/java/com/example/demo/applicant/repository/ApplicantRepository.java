package com.example.demo.applicant.repository;

import com.example.demo.applicant.entity.Applicant;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ApplicantRepository extends JpaRepository<Applicant, Long> {
}


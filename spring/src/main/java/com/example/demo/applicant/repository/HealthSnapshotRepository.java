package com.example.demo.applicant.repository;

import com.example.demo.applicant.entity.HealthSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;

public interface HealthSnapshotRepository extends JpaRepository<HealthSnapshot, Long> {
}


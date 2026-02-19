package com.example.demo.assessment.repository;

import com.example.demo.assessment.entity.AuditLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditLogRepository extends JpaRepository<AuditLog, Long> {
}


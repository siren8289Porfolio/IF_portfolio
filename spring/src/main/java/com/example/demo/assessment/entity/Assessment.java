package com.example.demo.assessment.entity;

import com.example.demo.admin.entity.AdminUser;
import com.example.demo.ai.entity.AIRiskResult;
import com.example.demo.applicant.entity.Applicant;
import com.example.demo.applicant.entity.HealthSnapshot;
import com.example.demo.job.entity.Job;
import jakarta.persistence.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "assessment", indexes = {
        // 대시보드 목록 정렬(ORDER BY assessed_at DESC)에 사용
        @Index(name = "idx_assessment_assessed_at", columnList = "assessed_at"),
        // 상태별 필터링(예: FINALIZED 건수 집계)에 사용
        @Index(name = "idx_assessment_status", columnList = "status"),
        // 신청자별 이력 조회(findByApplicant_IdOrderByAssessedAtDesc)에 사용
        @Index(name = "idx_assessment_applicant_assessed_at", columnList = "applicant_id, assessed_at")
})
public class Assessment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "assessment_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "applicant_id")
    private Applicant applicant;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "job_id")
    private Job job;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "health_id")
    private HealthSnapshot healthSnapshot;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "ai_result_id")
    private AIRiskResult aiRiskResult;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "admin_id")
    private AdminUser adminUser;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private AssessmentStatus status;

    @Column(name = "assessed_at")
    private OffsetDateTime assessedAt;

    // getters/setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Applicant getApplicant() {
        return applicant;
    }

    public void setApplicant(Applicant applicant) {
        this.applicant = applicant;
    }

    public Job getJob() {
        return job;
    }

    public void setJob(Job job) {
        this.job = job;
    }

    public HealthSnapshot getHealthSnapshot() {
        return healthSnapshot;
    }

    public void setHealthSnapshot(HealthSnapshot healthSnapshot) {
        this.healthSnapshot = healthSnapshot;
    }

    public AIRiskResult getAiRiskResult() {
        return aiRiskResult;
    }

    public void setAiRiskResult(AIRiskResult aiRiskResult) {
        this.aiRiskResult = aiRiskResult;
    }

    public AdminUser getAdminUser() {
        return adminUser;
    }

    public void setAdminUser(AdminUser adminUser) {
        this.adminUser = adminUser;
    }

    public AssessmentStatus getStatus() {
        return status;
    }

    public void setStatus(AssessmentStatus status) {
        this.status = status;
    }

    public OffsetDateTime getAssessedAt() {
        return assessedAt;
    }

    public void setAssessedAt(OffsetDateTime assessedAt) {
        this.assessedAt = assessedAt;
    }
}


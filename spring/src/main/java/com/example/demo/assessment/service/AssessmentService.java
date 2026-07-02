package com.example.demo.assessment.service;

import com.example.demo.admin.entity.AdminUser;
import com.example.demo.admin.repository.AdminUserRepository;
import com.example.demo.applicant.entity.Applicant;
import com.example.demo.applicant.entity.HealthSnapshot;
import com.example.demo.applicant.repository.ApplicantRepository;
import com.example.demo.applicant.repository.HealthSnapshotRepository;
import com.example.demo.assessment.dto.AssessmentCreateRequest;
import com.example.demo.assessment.dto.AssessmentRecordResponse;
import com.example.demo.assessment.dto.AssessmentResponse;
import com.example.demo.assessment.dto.AssessmentSummaryResponse;
import com.example.demo.assessment.entity.Assessment;
import com.example.demo.assessment.entity.AssessmentStatus;
import com.example.demo.assessment.dto.AssessmentUpdateRequest;
import com.example.demo.assessment.repository.AssessmentRepository;
import com.example.demo.ai.repository.AIRiskResultRepository;
import com.example.demo.global.exception.NotFoundException;
import com.example.demo.job.entity.Job;
import com.example.demo.job.repository.JobRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

@Service
public class AssessmentService {

    private final AssessmentRepository assessmentRepository;
    private final ApplicantRepository applicantRepository;
    private final HealthSnapshotRepository healthSnapshotRepository;
    private final JobRepository jobRepository;
    private final AdminUserRepository adminUserRepository;
    private final AIRiskResultRepository riskResultRepository;

    public AssessmentService(
            AssessmentRepository assessmentRepository,
            ApplicantRepository applicantRepository,
            HealthSnapshotRepository healthSnapshotRepository,
            JobRepository jobRepository,
            AdminUserRepository adminUserRepository,
            AIRiskResultRepository riskResultRepository
    ) {
        this.assessmentRepository = assessmentRepository;
        this.applicantRepository = applicantRepository;
        this.healthSnapshotRepository = healthSnapshotRepository;
        this.jobRepository = jobRepository;
        this.adminUserRepository = adminUserRepository;
        this.riskResultRepository = riskResultRepository;
    }

    public AssessmentResponse createAssessment(Long applicantId, AssessmentCreateRequest request) {
        Applicant applicant = applicantRepository.findById(applicantId)
                .orElseThrow(() -> new NotFoundException("Applicant not found: " + applicantId));

        Job job = jobRepository.findById(request.getJobId())
                .orElseThrow(() -> new NotFoundException("Job not found: " + request.getJobId()));

        HealthSnapshot healthSnapshot = healthSnapshotRepository.findById(request.getHealthId())
                .orElseThrow(() -> new NotFoundException("HealthSnapshot not found: " + request.getHealthId()));

        
        AdminUser adminUser = adminUserRepository.findAll().stream().findFirst().orElse(null);

        Assessment assessment = new Assessment();
        assessment.setApplicant(applicant);
        assessment.setJob(job);
        assessment.setHealthSnapshot(healthSnapshot);
        assessment.setAdminUser(adminUser);
        assessment.setStatus(AssessmentStatus.PENDING_AI);
        assessment.setAssessedAt(OffsetDateTime.now(ZoneOffset.UTC));

        Assessment saved = assessmentRepository.save(assessment);

        AssessmentResponse resp = toResponse(saved);
        return resp;
    }

    @Transactional(readOnly = true)
    public List<AssessmentResponse> listByApplicantId(Long applicantId) {
        return assessmentRepository.findByApplicant_IdOrderByAssessedAtDesc(applicantId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * 대시보드 목록 조회 (페이지네이션 + projection 쿼리로 N+1 및 과다 컬럼 조회 방지,
     * {@link AssessmentRepository#findAllRecords(Pageable)} 참고).
     * 정렬 기준(assessedAt desc 등)은 컨트롤러에서 Pageable에 담아 전달한다.
     */
    @Transactional(readOnly = true)
    public Page<AssessmentRecordResponse> listAllRecords(Pageable pageable) {
        return assessmentRepository.findAllRecords(pageable);
    }

    /**
     * 대시보드 요약 카드용 집계. 목록 페이지를 프론트에서 length/filter로 세면 페이지 크기를
     * 넘는 순간 값이 틀리므로, COUNT 쿼리 3번으로 서버에서 직접 계산한다.
     */
    @Transactional(readOnly = true)
    public AssessmentSummaryResponse getSummary() {
        long total = assessmentRepository.count();
        long highRisk = assessmentRepository.countByAiRiskResult_RiskGrade("HIGH");
        long finalized = assessmentRepository.countByStatus(AssessmentStatus.FINALIZED);
        return new AssessmentSummaryResponse(total, highRisk, finalized);
    }

    /** 기록 삭제: AI 결과 제거 후 assessment 삭제 */
    @Transactional
    public void deleteAssessment(Long assessmentId) {
        Assessment a = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new NotFoundException("Assessment not found: " + assessmentId));
        if (a.getAiRiskResult() != null) {
            var riskResult = a.getAiRiskResult();
            a.setAiRiskResult(null);
            assessmentRepository.save(a);
            riskResultRepository.delete(riskResult);
        }
        assessmentRepository.delete(a);
    }

    /** 기록 상태만 수정 (상태값: PENDING_AI, AI_COMPLETED, FINALIZED) */
    @Transactional
    public void updateAssessment(Long assessmentId, AssessmentUpdateRequest request) {
        Assessment a = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new NotFoundException("Assessment not found: " + assessmentId));
        if (request.getStatus() != null && !request.getStatus().isBlank()) {
            a.setStatus(AssessmentStatus.valueOf(request.getStatus().trim()));
            assessmentRepository.save(a);
        }
    }

    private AssessmentResponse toResponse(Assessment a) {
        AssessmentResponse resp = new AssessmentResponse();
        resp.setId(a.getId());
        resp.setApplicantId(a.getApplicant().getId());
        resp.setStatus(a.getStatus().name());
        resp.setAssessedAt(a.getAssessedAt());
        return resp;
    }
}


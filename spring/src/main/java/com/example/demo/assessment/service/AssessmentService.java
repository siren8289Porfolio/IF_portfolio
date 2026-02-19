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
import com.example.demo.assessment.dto.JobMatchDto;
import com.example.demo.assessment.dto.JobMatchRequest;
import com.example.demo.assessment.entity.Assessment;
import com.example.demo.assessment.entity.AssessmentStatus;
import com.example.demo.assessment.entity.JobMatch;
import com.example.demo.assessment.dto.AssessmentUpdateRequest;
import com.example.demo.assessment.repository.AssessmentRepository;
import com.example.demo.assessment.repository.JobMatchRepository;
import com.example.demo.ai.repository.AIRiskResultRepository;
import com.example.demo.global.exception.NotFoundException;
import com.example.demo.job.entity.Job;
import com.example.demo.job.repository.JobRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;

@Service
public class AssessmentService {

    private final AssessmentRepository assessmentRepository;
    private final ApplicantRepository applicantRepository;
    private final HealthSnapshotRepository healthSnapshotRepository;
    private final JobRepository jobRepository;
    private final AdminUserRepository adminUserRepository;
    private final JobMatchRepository jobMatchRepository;
    private final AIRiskResultRepository riskResultRepository;

    public AssessmentService(
            AssessmentRepository assessmentRepository,
            ApplicantRepository applicantRepository,
            HealthSnapshotRepository healthSnapshotRepository,
            JobRepository jobRepository,
            AdminUserRepository adminUserRepository,
            JobMatchRepository jobMatchRepository,
            AIRiskResultRepository riskResultRepository
    ) {
        this.assessmentRepository = assessmentRepository;
        this.applicantRepository = applicantRepository;
        this.healthSnapshotRepository = healthSnapshotRepository;
        this.jobRepository = jobRepository;
        this.adminUserRepository = adminUserRepository;
        this.jobMatchRepository = jobMatchRepository;
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

    public List<AssessmentResponse> listByApplicantId(Long applicantId) {
        return assessmentRepository.findByApplicant_IdOrderByAssessedAtDesc(applicantId).stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    /** 앱 기록 목록: 웹에서 추가한 assessment 전체 (이름, 연령, 직무, 신체수준, 위험도, 일시) */
    @Transactional(readOnly = true)
    public List<AssessmentRecordResponse> listAllRecords() {
        return assessmentRepository.findAllByOrderByAssessedAtDesc().stream()
                .map(this::toRecordResponse)
                .collect(Collectors.toList());
    }

    private AssessmentRecordResponse toRecordResponse(Assessment a) {
        AssessmentRecordResponse r = new AssessmentRecordResponse();
        r.setId(a.getId());
        r.setApplicantName(a.getApplicant().getDisplayName());
        r.setAge(a.getApplicant().getAge());
        r.setJobTitle(a.getJob().getJobTitle());
        r.setPhysicalLevel(a.getHealthSnapshot().getPhysicalLevel() != null
                ? String.valueOf(a.getHealthSnapshot().getPhysicalLevel()) : null);
        r.setAssessedAt(a.getAssessedAt());
        if (a.getAiRiskResult() != null && a.getAiRiskResult().getTotalRiskPercent() != null) {
            r.setRiskScore(a.getAiRiskResult().getTotalRiskPercent());
        }
        List<JobMatchDto> matchDtos = jobMatchRepository.findByAssessment_IdOrderByMatchedAtDesc(a.getId()).stream()
                .map(this::toJobMatchDto)
                .collect(Collectors.toList());
        r.setJobMatches(matchDtos);
        return r;
    }

    private JobMatchDto toJobMatchDto(JobMatch m) {
        JobMatchDto dto = new JobMatchDto();
        dto.setId(m.getId());
        dto.setJobName(m.getJobName());
        dto.setLocation(m.getLocation());
        dto.setTime(m.getTime());
        if (m.getWorkDays() != null && !m.getWorkDays().isEmpty()) {
            dto.setWorkDays(java.util.Arrays.asList(m.getWorkDays().split(",")));
        } else {
            dto.setWorkDays(new ArrayList<>());
        }
        dto.setDescription(m.getDescription());
        dto.setMatchedAt(m.getMatchedAt());
        return dto;
    }

    /** 웹에서 매칭 완료 시 호출. 해당 assessment의 기존 매칭을 지우고 새 목록으로 저장. */
    @Transactional
    public void saveJobMatches(Long assessmentId, List<JobMatchRequest> requests) {
        Assessment assessment = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new NotFoundException("Assessment not found: " + assessmentId));
        jobMatchRepository.deleteByAssessment_Id(assessmentId);
        if (requests == null || requests.isEmpty()) return;
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        for (JobMatchRequest req : requests) {
            JobMatch m = new JobMatch();
            m.setAssessment(assessment);
            m.setJobName(req.getJobName() != null ? req.getJobName() : "");
            m.setLocation(req.getLocation());
            m.setTime(req.getTime());
            m.setWorkDays(req.getWorkDays() != null ? String.join(",", req.getWorkDays()) : "");
            m.setDescription(req.getDescription());
            m.setMatchedAt(now);
            jobMatchRepository.save(m);
        }
    }

    /** 기록 삭제: AI 결과·매칭 제거 후 assessment 삭제 */
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
        jobMatchRepository.deleteByAssessment_Id(assessmentId);
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


package com.example.demo.ai.service;

import com.example.demo.ai.client.AIClient;
import com.example.demo.ai.dto.ExplainRequestDto;
import com.example.demo.ai.dto.ExplainResponseDto;
import com.example.demo.ai.dto.ScoreRequestDto;
import com.example.demo.ai.dto.ScoreResponseDto;
import com.example.demo.ai.entity.AIRiskResult;
import com.example.demo.ai.repository.AIRiskResultRepository;
import com.example.demo.applicant.entity.Applicant;
import com.example.demo.applicant.entity.HealthSnapshot;
import com.example.demo.assessment.dto.AssessmentRiskDetailResponse;
import com.example.demo.assessment.entity.Assessment;
import com.example.demo.assessment.entity.AssessmentStatus;
import com.example.demo.assessment.repository.AssessmentRepository;
import com.example.demo.global.exception.AiServiceTimeoutException;
import com.example.demo.global.exception.AiServiceUnavailableException;
import com.example.demo.global.exception.NotFoundException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

@Service
public class AIRiskService {

    private static final Logger log = LoggerFactory.getLogger(AIRiskService.class);

    private final AIClient aiClient;
    private final AssessmentRepository assessmentRepository;
    private final AIRiskResultRepository riskResultRepository;
    private final ObjectMapper objectMapper;
    private final TransactionTemplate transactionTemplate;

    public AIRiskService(AIClient aiClient,
                         AssessmentRepository assessmentRepository,
                         AIRiskResultRepository riskResultRepository,
                         ObjectMapper objectMapper,
                         PlatformTransactionManager transactionManager) {
        this.aiClient = aiClient;
        this.assessmentRepository = assessmentRepository;
        this.riskResultRepository = riskResultRepository;
        this.objectMapper = objectMapper;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    /**
     * FastAPI /score(+선택 /explain) 호출 후 결과 저장.
     * 네트워크 호출은 DB 트랜잭션 밖, 영속화만 로컬 트랜잭션.
     * score 실패 → PENDING_AI 유지 + 502/504.
     * explain 실패 → score만 저장하고 AI_COMPLETED (fallback).
     * 기존 AI 결과가 있으면 덮어씀 (idempotency).
     */
    public void computeAndSaveRisk(Long assessmentId) {
        Prep prep = transactionTemplate.execute(status -> {
            ScoreRequestDto scoreReq = buildScoreRequest(assessmentId);
            Integer age = assessmentRepository.findById(assessmentId)
                    .map(a -> a.getApplicant().getAge())
                    .orElse(null);
            return new Prep(scoreReq, age);
        });

        ScoreRequestDto scoreReq = prep.scoreReq();
        log.info("computeRisk assessmentId={} physicalLevel={} workIntensity={} ageBand={}",
                assessmentId, scoreReq.getPhysicalLevel(), scoreReq.getWorkIntensity(), scoreReq.getAgeBand());

        ScoreResponseDto scoreResp = aiClient.score(scoreReq);

        ExplainRequestDto explainReq = new ExplainRequestDto();
        explainReq.setRiskScore(scoreResp.getRiskScore());
        explainReq.setRiskBand(scoreResp.getRiskBand());
        explainReq.setTopFactors(scoreResp.getTopFactors());
        explainReq.setCaseSummary(buildCaseSummary(scoreReq, prep.age()));

        ExplainResponseDto explainResp = null;
        try {
            explainResp = aiClient.explain(explainReq);
        } catch (AiServiceTimeoutException | AiServiceUnavailableException e) {
            log.warn("explain fallback assessmentId={}: {}", assessmentId, e.getMessage());
        }

        ExplainResponseDto explainFinal = explainResp;
        transactionTemplate.executeWithoutResult(status ->
                persistScoreResult(assessmentId, scoreResp, explainFinal));
    }

    private record Prep(ScoreRequestDto scoreReq, Integer age) {}

    private ScoreRequestDto buildScoreRequest(Long assessmentId) {
        Assessment assessment = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new NotFoundException("Assessment not found: " + assessmentId));

        Applicant applicant = assessment.getApplicant();
        var job = assessment.getJob();
        HealthSnapshot health = assessment.getHealthSnapshot();

        ScoreRequestDto scoreReq = new ScoreRequestDto();
        scoreReq.setAgeBand(ageToBand(applicant.getAge()));
        scoreReq.setRegion(job.getWorkplace() != null && !job.getWorkplace().isBlank() ? job.getWorkplace() : "기타");
        scoreReq.setJobCategory(job.getJobTitle() != null ? job.getJobTitle() : "기타");
        Integer physicalLevel = health.getPhysicalLevel();
        scoreReq.setWorkIntensity(physicalLevelToWorkIntensity(physicalLevel));
        scoreReq.setPhysicalLevel(physicalLevel);
        scoreReq.setEnvironmentFlags(new ArrayList<>());
        scoreReq.setHealthFlags(new ArrayList<>());
        return scoreReq;
    }

    private void persistScoreResult(Long assessmentId, ScoreResponseDto scoreResp, ExplainResponseDto explainResp) {
        Assessment assessment = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new NotFoundException("Assessment not found: " + assessmentId));

        String explanationJson = null;
        if (explainResp != null) {
            try {
                explanationJson = objectMapper.writeValueAsString(explainResp);
            } catch (JsonProcessingException ignored) {
            }
        }

        AIRiskResult existing = riskResultRepository.findByAssessment_Id(assessmentId)
                .orElseGet(assessment::getAiRiskResult);
        AIRiskResult result = existing != null ? existing : new AIRiskResult();
        result.setTotalRiskPercent((int) Math.round(scoreResp.getRiskScore()));
        result.setRiskGrade(gradeOf(scoreResp.getRiskBand()));
        result.setGeneratedAt(OffsetDateTime.now(ZoneOffset.UTC));
        result.setModelVersion("elder-risk-poc-v1");
        result.setExplanationJson(explanationJson);
        result.setAssessment(assessment);
        result = riskResultRepository.save(result);

        assessment.setAiRiskResult(result);
        if (assessment.getStatus() == AssessmentStatus.PENDING_AI
                && assessment.getStatus().canTransitionTo(AssessmentStatus.AI_COMPLETED)) {
            assessment.setStatus(AssessmentStatus.AI_COMPLETED);
        }
        assessmentRepository.save(assessment);
    }

    /** FastAPI riskBand → 저장용 등급 (LOW/MID/HIGH). */
    public static String gradeOf(String riskBand) {
        if (riskBand == null) {
            return "MID";
        }
        return switch (riskBand) {
            case "낮음" -> "LOW";
            case "매우 높음", "높음" -> "HIGH";
            default -> "MID";
        };
    }

    @Transactional(readOnly = true)
    public AssessmentRiskDetailResponse getRiskDetail(Long assessmentId) {
        Assessment assessment = assessmentRepository.findById(assessmentId)
                .orElseThrow(() -> new NotFoundException("Assessment not found: " + assessmentId));

        AIRiskResult risk = assessment.getAiRiskResult();
        if (risk == null || risk.getTotalRiskPercent() == null) {
            throw new NotFoundException("AI risk result not found for assessment: " + assessmentId);
        }

        AssessmentRiskDetailResponse resp = new AssessmentRiskDetailResponse();
        resp.setRiskScore(risk.getTotalRiskPercent());
        String grade = risk.getRiskGrade();
        resp.setRiskGrade(grade);
        String band = switch (grade != null ? grade : "MID") {
            case "LOW" -> "낮음";
            case "HIGH" -> "높음";
            default -> "보통";
        };
        resp.setRiskBand(band);

        if (risk.getExplanationJson() != null && !risk.getExplanationJson().isBlank()) {
            try {
                ExplainResponseDto explain = objectMapper.readValue(risk.getExplanationJson(), ExplainResponseDto.class);
                resp.setSummary(explain.getSummary());
                resp.setGuidance(explain.getGuidance());
                resp.setDisclaimer(explain.getDisclaimer());
                if (explain.getFactorExplanations() != null && !explain.getFactorExplanations().isEmpty()) {
                    List<String> factors = new ArrayList<>();
                    explain.getFactorExplanations().forEach(fe -> {
                        String name = fe.getName() != null ? fe.getName() : "";
                        String text = fe.getText() != null ? fe.getText() : "";
                        factors.add(name.isEmpty() ? text : name + ": " + text);
                    });
                    resp.setFactorSummaries(factors);
                }
            } catch (JsonProcessingException e) {
                resp.setSummary("저장된 AI 설명을 불러오지 못했습니다. (형식 오류)");
                resp.setDisclaimer("본 결과는 판단 보조 자료일 뿐이며, 최종 판단과 책임은 담당자에게 있습니다.");
            }
        }

        return resp;
    }

    private static String ageToBand(Integer age) {
        if (age == null) return "65-69";
        if (age >= 75) return "75+";
        if (age >= 70) return "70-74";
        return "65-69";
    }

    private static String physicalLevelToWorkIntensity(Integer level) {
        if (level == null) return "중";
        if (level <= 1) return "낮음";
        if (level <= 3) return "중";
        return "높음";
    }

    private static String buildCaseSummary(ScoreRequestDto req, Integer age) {
        return String.format("%s, %s세, %s 직무, %s 근무강도 등",
                req.getRegion(),
                age != null ? age : "-",
                req.getJobCategory(),
                req.getWorkIntensity());
    }
}

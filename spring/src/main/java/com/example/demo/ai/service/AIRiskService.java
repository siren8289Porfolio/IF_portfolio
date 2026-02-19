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
import com.example.demo.assessment.entity.Assessment;
import com.example.demo.assessment.dto.AssessmentRiskDetailResponse;
import com.example.demo.assessment.repository.AssessmentRepository;
import com.example.demo.global.exception.NotFoundException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Service;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClientException;

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

    public AIRiskService(AIClient aiClient,
                         AssessmentRepository assessmentRepository,
                         AIRiskResultRepository riskResultRepository,
                         ObjectMapper objectMapper) {
        this.aiClient = aiClient;
        this.assessmentRepository = assessmentRepository;
        this.riskResultRepository = riskResultRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * 평가 한 건에 대해 FastAPI /score + /explain 호출 후 결과를 저장.
     * 기존 AI 결과가 있으면 덮어씀.
     */
    @Transactional
    public void computeAndSaveRisk(Long assessmentId) {
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

        log.info("computeRisk assessmentId={} physicalLevel={} workIntensity={} ageBand={}",
                assessmentId, physicalLevel, scoreReq.getWorkIntensity(), scoreReq.getAgeBand());

        ScoreResponseDto scoreResp;
        try {
            scoreResp = aiClient.score(scoreReq);
        } catch (RestClientException e) {
            throw new RuntimeException("AI score API 호출 실패: " + e.getMessage(), e);
        }

        String caseSummary = buildCaseSummary(scoreReq, applicant.getAge());
        ExplainRequestDto explainReq = new ExplainRequestDto();
        explainReq.setRiskScore(scoreResp.getRiskScore());
        explainReq.setRiskBand(scoreResp.getRiskBand());
        explainReq.setTopFactors(scoreResp.getTopFactors());
        explainReq.setCaseSummary(caseSummary);

        ExplainResponseDto explainResp;
        try {
            explainResp = aiClient.explain(explainReq);
        } catch (RestClientException e) {
            explainResp = null;
        }

        String explanationJson = null;
        if (explainResp != null) {
            try {
                explanationJson = objectMapper.writeValueAsString(explainResp);
            } catch (JsonProcessingException ignored) {
            }
        }

        // assessment 연관관계가 비어 있어도, 동일 assessment에 대한 기존 AI 결과가 있으면 재사용
        AIRiskResult existing = riskResultRepository.findByAssessment_Id(assessmentId)
                .orElseGet(assessment::getAiRiskResult);
        AIRiskResult result = existing != null ? existing : new AIRiskResult();
        result.setTotalRiskPercent((int) Math.round(scoreResp.getRiskScore()));
        result.setRiskGrade(riskBandToGrade(scoreResp.getRiskBand()));
        result.setGeneratedAt(OffsetDateTime.now(ZoneOffset.UTC));
        result.setModelVersion("elder-risk-poc-v1");
        result.setExplanationJson(explanationJson);
        result.setAssessment(assessment);
        result = riskResultRepository.save(result);

        assessment.setAiRiskResult(result);
        assessmentRepository.save(assessment);
    }

    /**
     * 평가 한 건의 AI 위험도/설명 상세를 조회.
     */
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
        // grade LOW/MID/HIGH를 한국어 band로 변환
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
                // 저장된 설명 JSON 파싱 실패 시 fallback 문구로 UI가 빈칸 대신 안내 표시
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

    private static String riskBandToGrade(String riskBand) {
        if (riskBand == null) return "MID";
        return switch (riskBand) {
            case "낮음" -> "LOW";
            case "매우 높음", "높음" -> "HIGH";
            default -> "MID";
        };
    }

    private static String buildCaseSummary(ScoreRequestDto req, Integer age) {
        return String.format("%s, %s세, %s 직무, %s 근무강도 등",
                req.getRegion(),
                age != null ? age : "-",
                req.getJobCategory(),
                req.getWorkIntensity());
    }
}

package com.example.demo.assessment.controller;

import com.example.demo.ai.service.AIRiskService;
import com.example.demo.assessment.dto.AssessmentRecordResponse;
import com.example.demo.assessment.dto.AssessmentRiskDetailResponse;
import com.example.demo.assessment.dto.AssessmentSummaryResponse;
import com.example.demo.assessment.dto.AssessmentUpdateRequest;
import com.example.demo.assessment.service.AssessmentService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/**
 * 평가 기록 전체 목록 및 위험도 산출/조회, 상태 변경, 삭제.
 * GET /api/assessments → 대시보드 전체 기록 조회 (페이지네이션, 기본 assessedAt desc 정렬).
 * POST /api/assessments/{id}/compute-risk → FastAPI /score + /explain 호출 후 AI 결과 저장.
 */
@RestController
@RequestMapping("/api/assessments")
public class AssessmentRecordController {

    private final AssessmentService assessmentService;
    private final AIRiskService aiRiskService;

    public AssessmentRecordController(AssessmentService assessmentService, AIRiskService aiRiskService) {
        this.assessmentService = assessmentService;
        this.aiRiskService = aiRiskService;
    }

    @GetMapping
    public Page<AssessmentRecordResponse> listAll(
            @PageableDefault(size = 50, sort = "assessedAt", direction = Sort.Direction.DESC) Pageable pageable
    ) {
        return assessmentService.listAllRecords(pageable);
    }

    /** 대시보드 요약 카드(총 건수/고위험군/완료 건수). 목록과 별도로 COUNT 쿼리로 집계한다. */
    @GetMapping("/summary")
    public AssessmentSummaryResponse getSummary() {
        return assessmentService.getSummary();
    }

    @PostMapping("/{assessmentId}/compute-risk")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void computeRisk(@PathVariable Long assessmentId) {
        aiRiskService.computeAndSaveRisk(assessmentId);
    }

    @GetMapping("/{assessmentId}/risk-detail")
    public AssessmentRiskDetailResponse getRiskDetail(@PathVariable Long assessmentId) {
        return aiRiskService.getRiskDetail(assessmentId);
    }

    @DeleteMapping("/{assessmentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteRecord(@PathVariable Long assessmentId) {
        assessmentService.deleteAssessment(assessmentId);
    }

    @PatchMapping("/{assessmentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void updateRecord(@PathVariable Long assessmentId, @RequestBody AssessmentUpdateRequest body) {
        assessmentService.updateAssessment(assessmentId, body);
    }
}

package com.example.demo.assessment.controller;

import com.example.demo.ai.service.AIRiskService;
import com.example.demo.assessment.dto.AssessmentRecordResponse;
import com.example.demo.assessment.dto.AssessmentRiskDetailResponse;
import com.example.demo.assessment.dto.AssessmentUpdateRequest;
import com.example.demo.assessment.dto.JobMatchRequest;
import com.example.demo.assessment.service.AssessmentService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * 앱용: 웹에서 추가한 assessment 전체 목록.
 * GET /api/assessments → 앱 "기록" 화면에 표시.
 * POST /api/assessments/{id}/job-matches → 웹에서 매칭 저장 후 앱에 전달.
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
    public List<AssessmentRecordResponse> listAll() {
        return assessmentService.listAllRecords();
    }

    @PostMapping("/{assessmentId}/job-matches")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void saveJobMatches(@PathVariable Long assessmentId, @RequestBody List<JobMatchRequest> body) {
        assessmentService.saveJobMatches(assessmentId, body != null ? body : List.of());
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

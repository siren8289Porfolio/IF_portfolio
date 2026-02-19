package com.example.demo.assessment.controller;

import com.example.demo.assessment.dto.AssessmentCreateRequest;
import com.example.demo.assessment.dto.AssessmentResponse;
import com.example.demo.assessment.service.AssessmentService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/applicants/{applicantId}/assessments")
public class AssessmentController {

    private final AssessmentService assessmentService;

    public AssessmentController(AssessmentService assessmentService) {
        this.assessmentService = assessmentService;
    }

    @GetMapping
    public List<AssessmentResponse> listAssessments(@PathVariable Long applicantId) {
        return assessmentService.listByApplicantId(applicantId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AssessmentResponse createAssessment(
            @PathVariable Long applicantId,
            @RequestBody AssessmentCreateRequest request
    ) {
        return assessmentService.createAssessment(applicantId, request);
    }
}


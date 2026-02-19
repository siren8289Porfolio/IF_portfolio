package com.example.demo.applicant.controller;

import com.example.demo.applicant.dto.ApplicantCreateRequest;
import com.example.demo.applicant.dto.ApplicantResponse;
import com.example.demo.applicant.dto.HealthSnapshotCreateRequest;
import com.example.demo.applicant.dto.HealthSnapshotResponse;
import com.example.demo.applicant.service.ApplicantService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/applicants")
public class ApplicantController {

    private final ApplicantService applicantService;

    public ApplicantController(ApplicantService applicantService) {
        this.applicantService = applicantService;
    }

    @GetMapping
    public List<ApplicantResponse> listApplicants() {
        return applicantService.listApplicants();
    }

    @GetMapping("/{id}")
    public ApplicantResponse getApplicant(@PathVariable Long id) {
        return applicantService.getApplicant(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApplicantResponse createApplicant(@RequestBody ApplicantCreateRequest request) {
        return applicantService.createApplicant(request);
    }

    @PostMapping("/{applicantId}/health-snapshots")
    @ResponseStatus(HttpStatus.CREATED)
    public HealthSnapshotResponse createHealthSnapshot(
            @PathVariable Long applicantId,
            @RequestBody HealthSnapshotCreateRequest request
    ) {
        return applicantService.createHealthSnapshot(applicantId, request);
    }
}


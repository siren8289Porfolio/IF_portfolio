package com.example.demo.applicant.service;

import com.example.demo.applicant.dto.ApplicantCreateRequest;
import com.example.demo.applicant.dto.ApplicantResponse;
import com.example.demo.applicant.dto.HealthSnapshotCreateRequest;
import com.example.demo.applicant.dto.HealthSnapshotResponse;
import com.example.demo.applicant.entity.Applicant;
import com.example.demo.applicant.entity.HealthSnapshot;
import com.example.demo.applicant.repository.ApplicantRepository;
import com.example.demo.applicant.repository.HealthSnapshotRepository;
import com.example.demo.global.exception.NotFoundException;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class ApplicantService {

    private final ApplicantRepository applicantRepository;
    private final HealthSnapshotRepository healthSnapshotRepository;

    public ApplicantService(ApplicantRepository applicantRepository,
                            HealthSnapshotRepository healthSnapshotRepository) {
        this.applicantRepository = applicantRepository;
        this.healthSnapshotRepository = healthSnapshotRepository;
    }

    public List<ApplicantResponse> listApplicants() {
        return applicantRepository.findAll().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    public ApplicantResponse getApplicant(Long id) {
        Applicant applicant = applicantRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Applicant not found: " + id));
        return toResponse(applicant);
    }

    public ApplicantResponse createApplicant(ApplicantCreateRequest request) {
        Applicant applicant = new Applicant();
        applicant.setDisplayName(request.getDisplayName());
        applicant.setAge(request.getAge());
        applicant.setCreatedAt(OffsetDateTime.now(ZoneOffset.UTC));

        Applicant saved = applicantRepository.save(applicant);
        return toResponse(saved);
    }

    /** 신청자 건강 스냅샷 1건 생성 */
    public HealthSnapshotResponse createHealthSnapshot(Long applicantId, HealthSnapshotCreateRequest request) {
        Applicant applicant = applicantRepository.findById(applicantId)
                .orElseThrow(() -> new NotFoundException("Applicant not found: " + applicantId));

        HealthSnapshot snapshot = new HealthSnapshot();
        snapshot.setApplicant(applicant);
        snapshot.setPhysicalLevel(request.getPhysicalLevel());
        snapshot.setChronicDiseaseFlag(request.getChronicDiseaseFlag());
        snapshot.setWorkHourLimit(request.getWorkHourLimit());
        snapshot.setCreatedAt(OffsetDateTime.now(ZoneOffset.UTC));

        HealthSnapshot saved = healthSnapshotRepository.save(snapshot);

        HealthSnapshotResponse resp = new HealthSnapshotResponse();
        resp.setId(saved.getId());
        resp.setApplicantId(applicantId);
        resp.setPhysicalLevel(saved.getPhysicalLevel());
        resp.setChronicDiseaseFlag(saved.getChronicDiseaseFlag());
        resp.setWorkHourLimit(saved.getWorkHourLimit());
        resp.setCreatedAt(saved.getCreatedAt());
        return resp;
    }

    private ApplicantResponse toResponse(Applicant applicant) {
        ApplicantResponse resp = new ApplicantResponse();
        resp.setId(applicant.getId());
        resp.setDisplayName(applicant.getDisplayName());
        resp.setAge(applicant.getAge());
        resp.setCreatedAt(applicant.getCreatedAt());
        return resp;
    }
}

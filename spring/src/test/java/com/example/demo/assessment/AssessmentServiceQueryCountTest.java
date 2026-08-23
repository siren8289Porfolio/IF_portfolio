package com.example.demo.assessment;

import com.example.demo.applicant.entity.Applicant;
import com.example.demo.applicant.entity.HealthSnapshot;
import com.example.demo.applicant.repository.ApplicantRepository;
import com.example.demo.applicant.repository.HealthSnapshotRepository;
import com.example.demo.assessment.entity.Assessment;
import com.example.demo.assessment.entity.AssessmentStatus;
import com.example.demo.assessment.repository.AssessmentRepository;
import com.example.demo.assessment.service.AssessmentService;
import com.example.demo.job.entity.Job;
import com.example.demo.job.repository.JobRepository;
import jakarta.persistence.EntityManagerFactory;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;

import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class AssessmentServiceQueryCountTest {

    @Autowired
    private AssessmentService assessmentService;
    @Autowired
    private AssessmentRepository assessmentRepository;
    @Autowired
    private ApplicantRepository applicantRepository;
    @Autowired
    private HealthSnapshotRepository healthSnapshotRepository;
    @Autowired
    private JobRepository jobRepository;
    @Autowired
    private EntityManagerFactory entityManagerFactory;

    @BeforeEach
    void seedFiveAssessments() {
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        Job job = new Job();
        job.setJobTitle("청소");
        job.setWorkplace("서울");
        job.setCreatedAt(now);
        job = jobRepository.save(job);

        for (int i = 0; i < 5; i++) {
            Applicant ap = new Applicant();
            ap.setDisplayName("테스트" + i);
            ap.setAge(65 + i);
            ap.setCreatedAt(now);
            ap = applicantRepository.save(ap);

            HealthSnapshot hs = new HealthSnapshot();
            hs.setApplicant(ap);
            hs.setPhysicalLevel(2);
            hs.setCreatedAt(now);
            hs = healthSnapshotRepository.save(hs);

            Assessment a = new Assessment();
            a.setApplicant(ap);
            a.setJob(job);
            a.setHealthSnapshot(hs);
            a.setStatus(AssessmentStatus.PENDING_AI);
            a.setAssessedAt(now.minusDays(i));
            assessmentRepository.save(a);
        }
        assessmentRepository.flush();
    }

    @Test
    void listAllRecordsUsesBoundedQueryCount() {
        SessionFactory sf = entityManagerFactory.unwrap(SessionFactory.class);
        Statistics stats = sf.getStatistics();
        stats.clear();

        assessmentService.listAllRecords(
                PageRequest.of(0, 50, Sort.by(Sort.Direction.DESC, "assessedAt", "id")));

        long queryCount = stats.getPrepareStatementCount();
        // projection list + count = 2 (여유 버퍼 포함 ≤ 4)
        assertTrue(queryCount <= 4,
                "expected ≤4 SQL for dashboard list, got " + queryCount);
    }
}

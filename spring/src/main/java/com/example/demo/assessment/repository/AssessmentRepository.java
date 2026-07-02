package com.example.demo.assessment.repository;

import com.example.demo.assessment.dto.AssessmentRecordResponse;
import com.example.demo.assessment.entity.Assessment;
import com.example.demo.assessment.entity.AssessmentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface AssessmentRepository extends JpaRepository<Assessment, Long> {

    List<Assessment> findByApplicant_IdOrderByAssessedAtDesc(Long applicantId);

    /** 대시보드 요약 카드 "평가 완료" 건수. idx_assessment_status 인덱스를 탄다. */
    long countByStatus(AssessmentStatus status);

    /**
     * 대시보드 요약 카드 "고위험군 발견" 건수. ai_risk_result.risk_grade = 'HIGH' 부분 인덱스
     * (schema.sql의 idx_ai_risk_result_high 참고)를 타도록 설계되어, 값이 몇 종류뿐이고
     * 그중 'HIGH'만 자주 조회하는 상황에 최적화되어 있다.
     */
    long countByAiRiskResult_RiskGrade(String riskGrade);

    /**
     * 대시보드 목록 조회. applicant/job/healthSnapshot/aiRiskResult를 join(fetch가 아닌
     * 일반 join)해서 화면에 필요한 컬럼만 DTO로 바로 projection한다.
     *
     * fetch join + entity 매핑(@EntityGraph) 대신 이 방식을 쓰는 이유:
     *  - N+1은 fetch join과 동일하게 쿼리 1번으로 해결됨 (COUNT 포함 총 2번).
     *  - entity 전체 컬럼(description, work_hours, explanation_json 등 화면에 안 쓰는 값)을
     *    읽지 않아 I/O와 영속성 컨텍스트 관리 비용을 줄인다 (읽기 전용 목록이라 필요 없음).
     * count 쿼리는 Spring Data가 Pageable로부터 자동 생성한다.
     */
    @Query("""
            select new com.example.demo.assessment.dto.AssessmentRecordResponse(
                a.id, ap.displayName, ap.age, j.jobTitle,
                hs.physicalLevel, a.status,
                ar.totalRiskPercent, ar.riskGrade, a.assessedAt)
            from Assessment a
            join a.applicant ap
            join a.job j
            join a.healthSnapshot hs
            left join a.aiRiskResult ar
            """)
    Page<AssessmentRecordResponse> findAllRecords(Pageable pageable);
}

package com.example.demo.assessment.dto;

/**
 * 대시보드 요약 카드(총 건수/고위험군/완료 건수)용 집계 DTO.
 *
 * 목록 페이지(예: 100건)를 받아 프론트에서 length/filter로 계산하면 전체 건수가 페이지
 * 크기를 넘는 순간 값이 틀어진다. 이를 막기 위해 서버에서 COUNT 쿼리로 직접 집계한다
 * ({@link com.example.demo.assessment.repository.AssessmentRepository} 참고).
 */
public class AssessmentSummaryResponse {

    private final long totalCount;
    private final long highRiskCount;
    private final long finalizedCount;

    public AssessmentSummaryResponse(long totalCount, long highRiskCount, long finalizedCount) {
        this.totalCount = totalCount;
        this.highRiskCount = highRiskCount;
        this.finalizedCount = finalizedCount;
    }

    public long getTotalCount() { return totalCount; }
    public long getHighRiskCount() { return highRiskCount; }
    public long getFinalizedCount() { return finalizedCount; }
}

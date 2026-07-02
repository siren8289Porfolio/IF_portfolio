import {
  AssessmentCreateRequest,
  AssessmentRecordResponse,
  AssessmentResponse,
  AssessmentRiskDetailResponse,
  AssessmentSummaryResponse,
  PageResponse,
} from "./types";
import { apiRequest } from "./client";

/**
 * 대시보드 전체 목록 (신청자별로 N번 조회하는 대신 1번의 join 쿼리로 조회).
 */
export async function listAssessmentRecords(
  page = 0,
  size = 50
): Promise<PageResponse<AssessmentRecordResponse>> {
  return apiRequest<PageResponse<AssessmentRecordResponse>>(
    `/api/assessments?page=${page}&size=${size}&sort=assessedAt,desc`
  );
}

/**
 * 대시보드 요약 카드(총 건수/고위험군/완료 건수)용 집계.
 * 목록 페이지의 length/filter로 계산하면 전체 건수가 페이지 크기를 넘는 순간 값이
 * 틀어지므로, 서버에서 COUNT 쿼리로 집계한 값을 별도로 받는다.
 */
export async function getAssessmentSummary(): Promise<AssessmentSummaryResponse> {
  return apiRequest<AssessmentSummaryResponse>(`/api/assessments/summary`);
}

export async function createAssessment(
  applicantId: number,
  body: AssessmentCreateRequest
): Promise<AssessmentResponse> {
  return apiRequest<AssessmentResponse>(
    `/api/applicants/${applicantId}/assessments`,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
}

/** 기록 삭제 */
export async function deleteAssessment(assessmentId: number): Promise<void> {
  await apiRequest<void>(`/api/assessments/${assessmentId}`, {
    method: "DELETE",
  });
}

/** 기록 수정 (상태만: PENDING_AI | AI_COMPLETED | FINALIZED) */
export async function updateAssessment(
  assessmentId: number,
  body: { status?: string }
): Promise<void> {
  await apiRequest<void>(`/api/assessments/${assessmentId}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

/** AI 위험도 계산 트리거 */
export async function computeRisk(assessmentId: number): Promise<void> {
  await apiRequest<void>(`/api/assessments/${assessmentId}/compute-risk`, {
    method: "POST",
  });
}

/** AI 위험도 상세 조회 */
export async function getRiskDetail(
  assessmentId: number
): Promise<AssessmentRiskDetailResponse> {
  return apiRequest<AssessmentRiskDetailResponse>(
    `/api/assessments/${assessmentId}/risk-detail`
  );
}

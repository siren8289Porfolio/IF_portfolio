import {
  AssessmentCreateRequest,
  AssessmentResponse,
  AssessmentRiskDetailResponse,
} from "./types";
import { apiRequest } from "./client";

export async function listAssessmentsByApplicant(
  applicantId: number
): Promise<AssessmentResponse[]> {
  return apiRequest<AssessmentResponse[]>(
    `/api/applicants/${applicantId}/assessments`
  );
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

/** 웹에서 매칭 완료 시 서버에 저장 → 앱에서 조회 가능 */
export async function saveJobMatches(
  assessmentId: number,
  body: { jobName: string; location: string; time: string; workDays: string[]; description?: string }[]
): Promise<void> {
  await apiRequest<void>(`/api/assessments/${assessmentId}/job-matches`, {
    method: "POST",
    body: JSON.stringify(body),
  });
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

/** Backend API DTOs (align with openapi.yml / Spring DTOs) */

export interface ApplicantResponse {
  id: number;
  displayName: string;
  age: number;
  createdAt: string;
}

export interface ApplicantCreateRequest {
  displayName: string;
  age: number;
}

export interface HealthSnapshotCreateRequest {
  physicalLevel: number;
  chronicDiseaseFlag: boolean;
  workHourLimit: number;
}

export interface HealthSnapshotResponse {
  id: number;
  applicantId: number;
  physicalLevel: number;
  chronicDiseaseFlag: boolean;
  workHourLimit: number;
  createdAt: string;
}

export interface AssessmentResponse {
  id: number;
  applicantId: number;
  status: string;
  assessedAt: string;
}

export interface AssessmentCreateRequest {
  jobId: number;
  healthId: number;
}

export interface JobResponse {
  id: number;
  jobTitle: string;
  workplace: string;
  workHours: string;
  description: string;
  createdAt: string;
}

export interface AssessmentRiskDetailResponse {
  riskScore: number;
  riskBand: string;
  riskGrade: string;
  summary: string;
  factorSummaries: string[];
  guidance: string;
  disclaimer: string;
}

/** GET /api/assessments 목록 항목 (대시보드). fetch join으로 한 번에 조회됨. */
export interface AssessmentRecordResponse {
  id: number;
  applicantName: string;
  age: number;
  jobTitle: string;
  physicalLevel: string | null;
  status: string;
  riskScore: number | null;
  riskGrade: 'LOW' | 'MID' | 'HIGH' | null;
  assessedAt: string;
}

/** GET /api/assessments/summary. 목록과 별도로 COUNT 쿼리 3번으로 서버에서 집계한 값. */
export interface AssessmentSummaryResponse {
  totalCount: number;
  highRiskCount: number;
  finalizedCount: number;
}

/** Spring Data Page<T> 직렬화 형태 (일부 필드만 사용) */
export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

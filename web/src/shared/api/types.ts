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

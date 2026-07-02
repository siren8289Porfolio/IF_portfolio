import {
  ApplicantCreateRequest,
  ApplicantResponse,
  HealthSnapshotCreateRequest,
  HealthSnapshotResponse,
} from "./types";
import { apiRequest } from "./client";

export async function createApplicant(
  body: ApplicantCreateRequest
): Promise<ApplicantResponse> {
  return apiRequest<ApplicantResponse>("/api/applicants", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function createHealthSnapshot(
  applicantId: number,
  body: HealthSnapshotCreateRequest
): Promise<HealthSnapshotResponse> {
  return apiRequest<HealthSnapshotResponse>(
    `/api/applicants/${applicantId}/health-snapshots`,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  );
}

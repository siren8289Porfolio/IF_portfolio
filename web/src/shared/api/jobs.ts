import { JobResponse } from "./types";
import { apiRequest } from "./client";

export async function listJobs(): Promise<JobResponse[]> {
  return apiRequest<JobResponse[]>("/api/jobs");
}

import { getApiBaseUrl } from "@/shared/storage/apiConfigStorage";

export type JobMatchDto = {
  id: number;
  jobName: string;
  location: string;
  time: string;
  workDays: string[];
  description: string;
  matchedAt: string;
};

export type AssessmentRecordResponse = {
  id: number;
  applicantName: string;
  age: number;
  jobTitle: string;
  physicalLevel: string | null;
  riskScore: number | null;
  assessedAt: string;
  jobMatches?: JobMatchDto[];
};

const REQUEST_TIMEOUT_MS = 12000;

export async function fetchAssessmentRecords(): Promise<AssessmentRecordResponse[]> {
  const base = await getApiBaseUrl();
  const url = `${base}/api/assessments`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`API ${res.status}`);
    return res.json();
  } finally {
    clearTimeout(timeoutId);
  }
}

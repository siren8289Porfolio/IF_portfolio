import { getApiBaseUrl } from "@/shared/storage/apiConfigStorage";

export type JobResponse = {
  id: number;
  jobTitle: string;
  workplace: string;
  workHours: string;
  description: string;
  createdAt: string;
};

const REQUEST_TIMEOUT_MS = 12000;

export async function fetchJobs(): Promise<JobResponse[]> {
  const base = await getApiBaseUrl();
  const url = `${base}/api/jobs`;
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

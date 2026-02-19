export type ApplicantData = {
  age: number;
  job: string;
  physicalLevel: string;
  hasMedicalCondition: boolean;
  workHours: string;
  workIntensity: string;
};

export type JobMatchItem = {
  id: number;
  jobName: string;
  location: string;
  time: string;
  workDays: string[];
  description: string;
  matchedAt: string;
};

export type RiskRecord = ApplicantData & {
  riskScore: number;
  timestamp: string;
  id: string;
  jobMatches?: JobMatchItem[];
};

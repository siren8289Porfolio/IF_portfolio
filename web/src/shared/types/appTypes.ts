export interface Assessment {
  id: string;
  date: string;
  applicantName: string;
  age: number;
  healthStatus: string; // 'good', 'average', 'bad'
  riskScore: number;
  riskLevel: 'Low' | 'Medium' | 'High';
  riskFactors: string[];
  status: 'Draft' | 'Analyzed' | 'Completed';
}

export type Page =
  | 'login'
  | 'signup'
  | 'dashboard'
  | 'assessment-form'
  | 'risk-analysis'
  | 'risk-result';

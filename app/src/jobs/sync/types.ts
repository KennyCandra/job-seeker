import type { AtsPlatform, JobRecord } from "../../shared/types";

export type CompanyFetchResult = {
  companyId: number;
  companySlug: string;
  companyName: string;
  ats: AtsPlatform;
  fetched: number;
  newCount: number;
  changedCount: number;
  unchangedCount: number;
  closedCount: number;
  error?: string;
};

export type JobSyncResult = {
  newJobs: JobRecord[];
  changedJobs: JobRecord[];
  unchangedJobs: JobRecord[];
  closedJobs: JobRecord[];
  companyResults: CompanyFetchResult[];
};

export type NormalizedJobInput = {
  id: string;
  companyId: number;
  externalId: string;
  url: string;
  title: string;
  location: string;
  description: string;
  rawJson: unknown;
  contentHash?: string;
};
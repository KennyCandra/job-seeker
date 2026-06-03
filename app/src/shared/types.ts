export type JobRecord = {
  id: string;
  site: string;
  title: string;
  company: string;
  location: string;
  url: string;
  description: string;
  posted_at?: string;
};

export type FilterResult = {
  verdict: "accept" | "reject";
  score: number;
  reasons: string[];
  must_have_hits: string[];
  missing: string[];
};

export type ResumePayload = {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  portfolio?: string;
  experience: Array<{
    title: string;
    company: string;
    dates: string;
    bullets: string[];
  }>;
  skills: string[] | Array<{ category: string; items: string[] }>;
  education: Array<{
    degree: string;
    school: string;
    year: string;
  }>;
  projects?: Array<{
    name: string;
    link?: string;
    description?: string;
    techStack?: string;
    highlights?: string[];
    skillsUsed?: string;
  }>;
};

export type ApplicationPayload = {
  cover_letter: string;
  email_subject: string;
  email_body: string;
};

export type FilteredJob = {
  job: JobRecord;
  filter: FilterResult;
};

export type AppStatus = "approved" | "ready" | "applied" | "interviewing" | "offer" | "rejected" | "ghosted" | "withdrawn";

export type AtsPlatform = "greenhouse" | "lever" | "ashby";

export type CompanyRecord = {
  id: number;
  slug: string;
  name: string;
  ats: AtsPlatform;
  boardUrl: string;
  discoveredAt: string;
  lastFetchedAt: string | null;
  active: boolean;
};

export type SearchConfig = {
  roles: string[];
  location: string[];
  exclude: string[];
  ats: string[];
  min_score: number;
  discovery_interval_hours: number;
  targetCompanies: string[];
};

export type ShortlistItem = {
  jobId: string;
  company: string;
  companySlug: string;
  title: string;
  location: string;
  score: number;
  verdict: "accept" | "reject";
  reasons: string[];
  mustHaveHits: string[];
  missingItems: string[];
  applyUrl: string;
  filteredAt: string;
};

export type ApplicationRecord = {
  id: number;
  jobId: string;
  company: string;
  title: string;
  status: AppStatus;
  approvedAt: string | null;
  appliedAt: string | null;
  documents: string;
  notes: string;
  createdAt: string;
};

/**
 * UPDATE: Mar 2026 — Migration 2 restructured saved_jobs table.
 * Removed: jobKey, ats, metadata.
 * See migration 2 in app/src/db/migrate.ts.
 */
export type SavedJob = {
  companySlug: string;
  jobId: string;
  url: string;
  title: string;
  location: string;
  description: string;
  createdAt: string;
  updatedAt: string;
};

export type LlmProvider = "opencode" | "anthropic" | "openai";

export type LlmConfig = {
  provider: LlmProvider;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  timeoutMs: number;
};
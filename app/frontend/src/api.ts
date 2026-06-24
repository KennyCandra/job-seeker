export type AppStatus =
  | "approved" | "ready" | "applied" | "interviewing"
  | "offer" | "rejected" | "ghosted" | "withdrawn";

export interface Stats {
  companies: number;
  shortlist: number;
  applications: number;
  savedJobs: number;
  jobs: number;
  openJobs: number;
  closedJobs: number;
  docsGenerated: number;
  cvCount: number;
  coverLetterCount: number;
  recommendationCount: number;
}

export interface ShortlistItem {
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
}

export interface ApplicationRow {
  id: string;
  jobId: string;
  company: string;
  title: string;
  location: string;
  site: string;
  url: string;
  score: number;
  status: AppStatus;
  documents: string;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyFetchSummary {
  company: string;
  fetched: number;
  newJobs: number;
  changedJobs: number;
  unchangedJobs: number;
  closedJobs: number;
  filtered: number;
  accepted: number;
}

export interface CompanyRecord {
  id: number;
  slug: string;
  name: string;
  ats: string;
  endpoint: string;
  boardUrl: string;
  discoveredAt: string;
  lastFetchedAt: string | null;
  active: boolean;
}

export interface CompanyDiscoverySummary {
  ok: boolean;
  found: number;
  added: number;
  updated: number;
  unchanged: number;
  queries: number;
  source: "serpapi" | "playwright";
  companies: Array<{
    ats: string;
    slug: string;
    name: string;
    endpoint: string;
    sourceUrl: string;
  }>;
}

export interface SearchConfig {
  roles: string[];
  location: string[];
  exclude: string[];
  ats: string[];
  min_score: number;
  discovery_interval_hours: number;
  targetCompanies: string[];
}

export interface SavedJob {
  companySlug: string;
  jobId: string;
  url: string;
  title: string;
  location: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  processed?: boolean;
}

export interface FilterResult {
  accepted: boolean;
  score: number;
  reasons: string[];
  mustHaveHits: string[];
  missing: string[];
}

export interface CandidateFilterSummary {
  total: number;
  processed: number;
  skippedExisting: number;
  skippedClosed: number;
  accepted: number;
  rejected: number;
  minScore: number;
}

export interface SmartFilterAcceptedSummary {
  total: number;
  candidates: number;
  processed: number;
  skippedNotAccepted: number;
  skippedExistingSmart: number;
  accepted: number;
  rejected: number;
  failed: number;
}

export interface JobRecord {
  id: string;
  site: string;
  title: string;
  company: string;
  location: string;
  url: string;
  description: string;
  posted_at?: string;
}

export interface JobListItem {
  id: string;
  companySlug: string;
  companyName: string;
  title: string;
  location: string;
  url: string;
  status: string;
  ats: string;
  score: number | null;
  verdict: string | null;
  hasCv: boolean;
  hasCoverLetter: boolean;
  hasRecommendation: boolean;
  hasApplication: boolean;
  updatedAt: string;
}

export interface JobsListResponse {
  items: JobListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: {
    accepted: number;
    rejected: number;
    unfiltered: number;
  };
  options: {
    companies: string[];
    statuses: string[];
  };
}

export interface FilterDetail {
  id: string;
  verdict: string;
  score: number;
  reasons: string[];
  mustHaveHits: string[];
  missingItems: string[];
  model: string;
  promptVersion: string;
  createdAt: string;
}

export interface TaskCreateResponse {
  ok: boolean;
  runId: string;
  bullJobId?: string;
  status: string;
  jobId?: string;
}

export interface DocItem {
  id: string;
  jobId?: string;
  type: string;
  status: string;
  content: string;
  filePath: string;
  downloadUrl?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface AppSummary {
  id: string;
  status: string;
  score: number;
  documents: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobDetail {
  id: string;
  companySlug: string;
  companyName: string;
  ats: string;
  externalId: string;
  title: string;
  location: string;
  url: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  latestFilter: FilterDetail | null;
  latestSmartFilter: FilterDetail | null;
  canSmartFilter: boolean;
  documents: DocItem[];
  application: AppSummary | null;
}

export interface ApplyRunStep {
  id: string;
  runId: string;
  type: string;
  label: string;
  detail: string;
  screenshotPath: string | null;
  payload: string;
  createdAt: string;
}

export interface ApplyRun {
  id: string;
  jobId: string;
  status: string;
  profilePath: string;
  outputDir: string;
  currentUrl: string;
  error: string | null;
  summary: string;
  createdAt: string;
  updatedAt: string;
}

async function fetcher<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
  return res.json();
}

async function postJson<T>(url: string, body?: unknown): Promise<T> {
  return fetcher<T>(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

export const api = {
  stats: () => fetcher<Stats>("/api/stats"),

  shortlist: {
    list: () => fetcher<ShortlistItem[]>("/api/shortlist"),
    delete: (jobId: string) =>
      fetcher<{ ok: boolean }>(`/api/shortlist/${encodeURIComponent(jobId)}`, {
        method: "DELETE",
      }),
  },

  applications: {
    list: () => fetcher<ApplicationRow[]>("/api/applications"),
    updateStatus: (jobId: string, status: AppStatus) =>
      fetcher<{ ok: boolean }>(
        `/api/applications/${encodeURIComponent(jobId)}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        },
      ),
    delete: (jobId: string) =>
      fetcher<{ ok: boolean }>(
        `/api/applications/${encodeURIComponent(jobId)}`,
        { method: "DELETE" },
      ),
    pdfUrl: (jobId: string) => `/api/applications/${encodeURIComponent(jobId)}/pdf`,
    generate: (jobId: string) =>
      fetcher<{ pdfPath?: string; error?: string }>(
        `/api/applications/${encodeURIComponent(jobId)}/generate`,
        { method: "POST" },
      ),
    generateSSE: (jobId: string) =>
      `/api/applications/${encodeURIComponent(jobId)}/generate`,
  },

  companies: {
    list: () => fetcher<CompanyRecord[]>("/api/companies"),
    discover: () => postJson<CompanyDiscoverySummary>("/api/companies/discover"),
    create: (name: string, ats: string, endpoint?: string) =>
      fetcher<{ ok: boolean }>("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, ats, endpoint }),
      }),
    toggleActive: (slug: string, active: boolean) =>
      fetcher<{ ok: boolean }>(`/api/companies/${encodeURIComponent(slug)}/active`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      }),
    delete: (slug: string) =>
      fetcher<{ ok: boolean }>(`/api/companies/${encodeURIComponent(slug)}`, {
        method: "DELETE",
      }),
    fetch: (slug: string, filter = false) =>
      fetcher<{ ok: boolean; summary: CompanyFetchSummary }>(
        `/api/companies/${encodeURIComponent(slug)}/fetch`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filter }),
        },
      ),
  },

  config: {
    get: () => fetcher<SearchConfig>("/api/config"),
    save: (config: SearchConfig) =>
      fetcher<{ ok: boolean }>("/api/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      }),
  },

  savedJobs: {
    list: () => fetcher<SavedJob[]>("/api/saved-jobs"),
    byCompany: (company: string) =>
      fetcher<SavedJob[]>(`/api/saved-jobs/${encodeURIComponent(company)}`),
    filter: (companySlug: string, jobId: string) =>
      fetcher<FilterResult>(
        `/api/saved-jobs/${encodeURIComponent(companySlug)}/${encodeURIComponent(jobId)}/filter`,
        { method: "POST" },
      ),
  },

  jobs: {
    list: (options?: {
      page?: number;
      pageSize?: number;
      search?: string;
      company?: string;
      status?: string;
      verdict?: string;
      minScore?: number;
    }) => {
      const params = new URLSearchParams();
      if (options?.page) params.set("page", String(options.page));
      if (options?.pageSize) params.set("pageSize", String(options.pageSize));
      if (options?.search) params.set("search", options.search);
      if (options?.company) params.set("company", options.company);
      if (options?.status) params.set("status", options.status);
      if (options?.verdict) params.set("verdict", options.verdict);
      if (options?.minScore) params.set("minScore", String(options.minScore));
      const query = params.toString();
      return fetcher<JobsListResponse>(`/api/jobs${query ? `?${query}` : ""}`);
    },
    detail: (jobId: string) => fetcher<JobDetail>(`/api/jobs/${encodeURIComponent(jobId)}`),
    refetch: (jobId: string) =>
      postJson<{ ok: boolean; source: "company_endpoint" | "single_job_fallback"; jobId: string; updated: boolean }>(
        `/api/jobs/${encodeURIComponent(jobId)}/refetch`,
      ),
    filter: (jobId: string) =>
      fetcher<FilterResult>(`/api/jobs/${encodeURIComponent(jobId)}/filter`, { method: "POST" }),
    smartFilter: (jobId: string) =>
      postJson<TaskCreateResponse>(`/api/jobs/${encodeURIComponent(jobId)}/smart-filter`),
    smartFilterAccepted: (force = false) =>
      postJson<{ ok: boolean; summary: SmartFilterAcceptedSummary; results: Array<{ jobId: string; company: string; title: string; verdict: string; score: number; error?: string }> }>(
        "/api/jobs/smart-filter-accepted",
        { force },
      ),
    filterCandidates: (options?: { limit?: number; force?: boolean; companySlug?: string; includeClosed?: boolean }) =>
      postJson<{ ok: boolean; summary: CandidateFilterSummary; results: Array<FilterResult & { jobId: string; company: string; title: string; verdict: string; score: number }> }>(
        "/api/jobs/filter-candidates",
        options || { limit: 0 },
      ),
    generateDocument: (jobId: string, type: "cv" | "cover_letter" | "recommendation", force = false) =>
      postJson<{ ok: boolean; jobId: string; exists?: boolean; type: string; document?: DocItem; message?: string }>(
        `/api/jobs/${encodeURIComponent(jobId)}/documents`,
        { type, force },
      ),
    documentDownloadUrl: (jobId: string, documentId: string) =>
      `/api/jobs/${encodeURIComponent(jobId)}/documents/${encodeURIComponent(documentId)}/download`,
    createApplication: (jobId: string) =>
      postJson<{ ok: boolean; created: boolean; application?: AppSummary }>(
        `/api/jobs/${encodeURIComponent(jobId)}/application`,
      ),
  },

  extract: (text: string) =>
    fetcher<JobRecord>("/api/job/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    }),

  tasks: {
    list: () => fetcher<{ ok: boolean; tasks: any[] }>("/api/tasks"),
    create: (type: string, payload: Record<string, unknown>, force = false) =>
      postJson<TaskCreateResponse>(
        "/api/tasks",
        { type, payload, force },
      ),
    get: (runId: string) =>
      fetcher<{ ok: boolean; run: any }>(`/api/tasks/${encodeURIComponent(runId)}`),
    eventsUrl: (runId: string) => `/api/tasks/${encodeURIComponent(runId)}/events`,
    cancel: (runId: string) =>
      postJson<{ ok: boolean }>(`/api/tasks/${encodeURIComponent(runId)}/cancel`),
  },

  profile: {
    get: () => fetcher<{ ok: boolean; profile: any }>("/api/profile"),
    save: (data: Record<string, any>) =>
      fetcher<{ ok: boolean; profile: any }>("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }),
    answers: {
      list: () => fetcher<{ ok: boolean; answers: any[] }>("/api/profile/answers"),
      create: (data: { category: string; question: string; answer: string; tagsJson?: string }) =>
        postJson<{ ok: boolean; answer: any }>("/api/profile/answers", data),
      update: (id: string, data: Record<string, any>) =>
        fetcher<{ ok: boolean; answer: any }>(`/api/profile/answers/${encodeURIComponent(id)}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }),
      delete: (id: string) =>
        fetcher<{ ok: boolean }>(`/api/profile/answers/${encodeURIComponent(id)}`, { method: "DELETE" }),
    },
  },

  apply: {
    run: (jobId: string) =>
      postJson<{ ok: boolean; runId: string; taskRunId?: string; message: string }>(`/api/jobs/${encodeURIComponent(jobId)}/apply/run`),
    latest: (jobId: string) =>
      fetcher<{ run: ApplyRun | null; steps: ApplyRunStep[] }>(`/api/jobs/${encodeURIComponent(jobId)}/apply/latest`),
    getRun: (runId: string) =>
      fetcher<{ run: ApplyRun; steps: ApplyRunStep[] }>(`/api/apply/runs/${encodeURIComponent(runId)}`),
    resume: (runId: string) =>
      postJson<{ ok: boolean; result: { runId: string; status: string; error?: string; stepCount: number; outputDir: string } }>(
        `/api/apply/runs/${encodeURIComponent(runId)}/resume`,
      ),
    cancel: (runId: string) =>
      postJson<{ ok: boolean }>(`/api/apply/runs/${encodeURIComponent(runId)}/cancel`),
    screenshotUrl: (runId: string, fileName: string) =>
      `/api/apply/runs/${encodeURIComponent(runId)}/screenshots/${encodeURIComponent(fileName)}`,
  },
};

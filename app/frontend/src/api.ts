export type AppStatus =
  | "approved" | "ready" | "applied" | "interviewing"
  | "offer" | "rejected" | "ghosted" | "withdrawn";

export interface Stats {
  companies: number;
  shortlist: number;
  applications: number;
  savedJobs: number;
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

export interface CompanyRecord {
  id: number;
  slug: string;
  name: string;
  ats: string;
  boardUrl: string;
  discoveredAt: string;
  lastFetchedAt: string | null;
  active: boolean;
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

async function fetcher<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
  return res.json();
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
    create: (name: string, ats: string, boardUrl?: string) =>
      fetcher<{ ok: boolean }>("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, ats, boardUrl }),
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

  extract: (text: string) =>
    fetcher<JobRecord>("/api/job/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    }),
};

import { AppException } from "../../common/errors";
import type { JobSource, NormalizedJob } from "./types";

const GREENHOUSE_LIST_ENDPOINT = (board: string) =>
  `https://boards-api.greenhouse.io/v1/boards/${board}/jobs?content=true`;
const GREENHOUSE_JOB_ENDPOINT = (board: string, id: string) =>
  `https://boards-api.greenhouse.io/v1/boards/${board}/jobs/${id}?questions=false`;

const LEVER_POSTINGS_ENDPOINT = (company: string) =>
  `https://api.lever.co/v0/postings/${company}?mode=json&includeOffices=true`;
const LEVER_POSTING_ENDPOINT = (company: string, id: string) =>
  `https://api.lever.co/v0/postings/${company}/${id}?mode=json&additional_fields=descriptionPlain`;

const ASHBY_JOBS_ENDPOINT = "https://api.ashbyhq.com/posting-api/job-board/{org}";

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new AppException(res.status, `ATS fetch failed: ${res.status} for ${url}`);
  return (await res.json()) as T;
}

/** Extracts the board slug from either the boards-api endpoint or a public board URL. */
export function greenhouseBoardSlug(url: string): string {
  // https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true
  const api = url.match(/boards-api\.greenhouse\.io\/v1\/boards\/([^/?#]+)/i);
  if (api) return api[1];
  // https://boards.greenhouse.io/{slug} or https://job-boards.greenhouse.io/{slug}
  const board = url.match(/(?:job-)?boards\.greenhouse\.io\/([^/?#]+)/i);
  if (board) return board[1];
  return url; // caller passed a bare slug
}

export function leverCompanySlug(url: string): string {
  // https://api.lever.co/v0/postings/{slug}?mode=json
  const api = url.match(/api\.lever\.co\/v0\/postings\/([^/?#]+)/i);
  if (api) return api[1];
  // https://jobs.lever.co/{slug}
  const board = url.match(/jobs\.lever\.co\/([^/?#]+)/i);
  if (board) return board[1];
  return url;
}

export function ashbyOrgSlug(url: string): string {
  // https://api.ashbyhq.com/posting-api/job-board/{slug}?includeCompensation=true
  const api = url.match(/api\.ashbyhq\.com\/posting-api\/job-board\/([^/?#]+)/i);
  if (api) return api[1];
  // https://jobs.ashbyhq.com/{slug}
  const board = url.match(/jobs\.ashbyhq\.com\/([^/?#]+)/i);
  if (board) return board[1];
  return url;
}

export const greenhouseSource: JobSource = {
  name: "greenhouse",
  matches(url: string) {
    return url.includes("greenhouse.io") || url.includes("boards.greenhouse.io") || url.includes("job-boards.greenhouse.io");
  },
  async pullJobs(url: string) {
    const board = greenhouseBoardSlug(url);
    const listUrl = GREENHOUSE_LIST_ENDPOINT(board);
    const data = await fetchJson<{ jobs: any[] }>(listUrl);
    return data.jobs.map((raw) => ({ id: String(raw.id), raw }));
  },
  async pullJob(url: string, id: string) {
    const board = greenhouseBoardSlug(url);
    const data = await fetchJson<{ job: any }>(GREENHOUSE_JOB_ENDPOINT(board, id));
    return data.job;
  },
  async normalize(rawJob: any, company: any): Promise<NormalizedJob> {
    const location = (rawJob.location?.name ?? "").trim();
    const descriptionPlain = (rawJob.content ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const applyUrl =
      rawJob.absolute_url ?? `https://boards.greenhouse.io/${greenhouseBoardSlug(company.endpoint ?? company.slug ?? "")}/jobs/${rawJob.id}`;
    return {
      externalId: String(rawJob.id),
      site: company.ats ?? "greenhouse",
      title: (rawJob.title ?? "").trim(),
      company: company.name ?? company.slug ?? "",
      department: (rawJob.departments?.[0]?.name ?? rawJob.department ?? "").trim(),
      location,
      url: applyUrl,
      applyUrl,
      description: descriptionPlain,
      posted_at: rawJob.updated_at ?? rawJob.published_at ?? new Date().toISOString(),
      rawData: JSON.stringify(rawJob),
    };
  },
};

export const leverSource: JobSource = {
  name: "lever",
  matches(url: string) {
    return url.includes("lever.co") || url.includes("jobs.lever.co");
  },
  async pullJobs(url: string) {
    const company = leverCompanySlug(url);
    const data = await fetchJson<any[]>(LEVER_POSTINGS_ENDPOINT(company));
    return data.map((raw) => ({ id: String(raw.id), raw }));
  },
  async pullJob(url: string, id: string) {
    const company = leverCompanySlug(url);
    const data = await fetchJson<any>(LEVER_POSTING_ENDPOINT(company, id));
    return data;
  },
  async normalize(rawJob: any, company: any): Promise<NormalizedJob> {
    const location = ((rawJob.categories?.location ?? rawJob.location ?? "").toString()).trim();
    const descriptionPlain = (rawJob.descriptionPlain ?? rawJob.description ?? "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const applyUrl = rawJob.hostedUrl ?? rawJob.applyUrl ?? `https://jobs.lever.co/${leverCompanySlug(company.endpoint ?? company.slug ?? "")}/${rawJob.id}`;
    return {
      externalId: String(rawJob.id),
      site: company.ats ?? "lever",
      title: (rawJob.text ?? rawJob.title ?? "").trim(),
      company: company.name ?? company.slug ?? "",
      department: (rawJob.categories?.team ?? rawJob.team ?? "").trim(),
      location,
      url: applyUrl,
      applyUrl,
      description: descriptionPlain,
      posted_at: rawJob.createdAt ?? new Date().toISOString(),
      rawData: JSON.stringify(rawJob),
    };
  },
};

export const ashbySource: JobSource = {
  name: "ashby",
  matches(url: string) {
    return url.includes("ashbyhq.com") || url.includes("jobs.ashbyhq.com");
  },
  async pullJobs(url: string) {
    const org = ashbyOrgSlug(url);
    const endpoint = ASHBY_JOBS_ENDPOINT.replace("{org}", org);
    const data = await fetchJson<{ jobs: any[] }>(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    return data.jobs.map((raw) => ({ id: String(raw.id), raw }));
  },
  async pullJob(url: string, id: string) {
    const org = ashbyOrgSlug(url);
    const endpoint = ASHBY_JOBS_ENDPOINT.replace("{org}", org);
    const data = await fetchJson<{ jobs: any[] }>(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    return data.jobs.find((j) => String(j.id) === id) ?? null;
  },
  async normalize(rawJob: any, company: any): Promise<NormalizedJob> {
    const location = (rawJob.location?.name ?? rawJob.location ?? "").trim();
    const descriptionPlain = (rawJob.descriptionPlaintext ?? rawJob.description ?? "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const applyUrl = rawJob.applicationUrl ?? `https://jobs.ashbyhq.com/${ashbyOrgSlug(company.endpoint ?? company.slug ?? "")}/${rawJob.id}`;
    return {
      externalId: String(rawJob.id),
      site: company.ats ?? "ashby",
      title: (rawJob.title ?? "").trim(),
      company: company.name ?? company.slug ?? "",
      department: (rawJob.department ?? "").trim(),
      location,
      url: applyUrl,
      applyUrl,
      description: descriptionPlain,
      posted_at: rawJob.postedAt ?? new Date().toISOString(),
      rawData: JSON.stringify(rawJob),
    };
  },
};

export const jobSources: JobSource[] = [greenhouseSource, leverSource, ashbySource];

export function getSource(atsUrl: string): JobSource {
  const source = jobSources.find((s) => s.matches(atsUrl));
  if (!source) {
    throw new AppException(400, `Unsupported ATS URL: ${atsUrl}`);
  }
  return source;
}

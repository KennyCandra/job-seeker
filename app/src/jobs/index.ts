import type { AtsPlatform, JobRecord, CompanyRecord } from "../shared/types";
import { companies, jobs } from "../db";
import { APP_ROOT, endpointForAts, parseAtsUrl, slug } from "../shared/index";
import { join } from "path";
import { mkdirSync } from "fs";
import { classifyJobs } from "./sync/classify";
import { persistSyncResult } from "./sync/persist";
import { HttpError } from "./errors";
import type { JobSyncResult, CompanyFetchResult } from "./sync/types";
import { normalizeJob } from "./normalize/index";
import { fetchGreenhouseJobsWithFallback, fetchLeverJobs, fetchAshbyJobs } from "./ats/index";
import type { NormalizedJobInput } from "./sync/types";

export type RawJob = Record<string, unknown>;

export async function syncJobs(): Promise<JobSyncResult> {
  const allCompanies = companies.instance.getActive();
  console.log(`[sync] Syncing jobs from ${allCompanies.length} companies...`);

  const result: JobSyncResult = {
    newJobs: [],
    changedJobs: [],
    unchangedJobs: [],
    closedJobs: [],
    companyResults: [],
  };

  for (const company of allCompanies) {
    try {
      const companyResult = await syncCompany(company.slug, company);
      result.newJobs.push(...companyResult.newJobs);
      result.changedJobs.push(...companyResult.changedJobs);
      result.unchangedJobs.push(...companyResult.unchangedJobs);
      result.closedJobs.push(...companyResult.closedJobs);
      result.companyResults.push(companyResult.companyResult);
    } catch (err: any) {
      if (err instanceof HttpError && err.status === 404) {
        console.warn(`[sync] ${company.name} (${company.slug}) returned 404 — deactivating`);
        companies.instance.deactivate(company.slug);
      } else {
        console.warn(`[sync] Failed for ${company.name} (${company.slug}): ${err.message}`);
        companies.instance.updateFetchError(company.slug, err.message);
      }
      result.companyResults.push({
        companyId: company.id,
        companySlug: company.slug,
        companyName: company.name,
        ats: company.ats,
        fetched: 0,
        newCount: 0,
        changedCount: 0,
        unchangedCount: 0,
        closedCount: 0,
        error: err.message,
      });
    }

    await delay(1000 + Math.random() * 1000);
  }

  return result;
}

export type SingleCompanySyncResult = {
  companyResult: CompanyFetchResult;
  newJobs: JobRecord[];
  changedJobs: JobRecord[];
  unchangedJobs: JobRecord[];
  closedJobs: JobRecord[];
};

export async function syncCompany(companySlug: string, company?: CompanyRecord): Promise<SingleCompanySyncResult> {
  const c = company || companies.instance.getBySlug(companySlug);
  if (!c) throw new HttpError(404, `Company not found: ${companySlug}`);

  const ats = c.ats as AtsPlatform;
  const endpoint = c.endpoint || endpointForAts(c.slug, ats);
  const { jobs: rawJobs, endpoint: resolvedEndpoint } = await fetchCompanyJobs(ats, endpoint);
  if (resolvedEndpoint !== endpoint) {
    companies.instance.updateAts(c.slug, ats, resolvedEndpoint);
  }

  const rawDataByJobId = new Map<string, unknown>();
  const inputs: NormalizedJobInput[] = rawJobs.map((raw) => {
    const job = normalizeJob(raw, ats);
    rawDataByJobId.set(job.id, raw);
    return {
      id: job.id,
      companyId: c.id,
      externalId: extractExternalId(job),
      url: job.url,
      title: job.title,
      location: job.location,
      description: job.description,
      rawJson: raw,
    };
  });

  const companySync = classifyJobs(c.id, c.slug, c.name, ats, inputs);
  persistSyncResult(companySync.newJobs, companySync.changedJobs, companySync.unchangedJobs, c.id, rawDataByJobId);

  companies.instance.updateFetchedAt(c.slug);
  console.log(`[sync] ${c.name}: ` +
    `${companySync.companyResults[0].newCount} new, ` +
    `${companySync.companyResults[0].changedCount} changed, ` +
    `${companySync.companyResults[0].unchangedCount} unchanged, ` +
    `${companySync.companyResults[0].closedCount} closed`
  );

  const [cr] = companySync.companyResults;

  return {
    companyResult: cr,
    newJobs: companySync.newJobs,
    changedJobs: companySync.changedJobs,
    unchangedJobs: companySync.unchangedJobs,
    closedJobs: companySync.closedJobs,
  };
}

async function fetchCompanyJobs(ats: AtsPlatform, endpoint: string): Promise<{ jobs: RawJob[]; endpoint: string }> {
  switch (ats) {
    case "greenhouse": return fetchGreenhouseJobsWithFallback(endpoint);
    case "lever": return { jobs: await fetchLeverJobs(endpoint), endpoint };
    case "ashby": return { jobs: await fetchAshbyJobs(endpoint), endpoint };
    default: throw new Error(`Unknown ATS: ${ats}`);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Single-job fetch from URL (for manual URL entry) ──

const GREENHOUSE_URL_RX = /greenhouse\.io\/([^\/\s?]+)\/jobs\/(\d+)/i;
const LEVER_URL_RX = /lever\.co\/([^\/\s?]+)\/([a-f0-9-]+)/i;
const ASHBY_URL_RX = /ashbyhq\.com\/([^\/\s?]+)\/([a-f0-9-]+)/i;

export function parseJobUrl(url: string): { ats: AtsPlatform; companySlug: string; jobId: string } | null {
  let m = url.match(GREENHOUSE_URL_RX);
  if (m) return { ats: "greenhouse", companySlug: m[1], jobId: m[2] };
  m = url.match(LEVER_URL_RX);
  if (m) return { ats: "lever", companySlug: m[1], jobId: m[2] };
  m = url.match(ASHBY_URL_RX);
  if (m) return { ats: "ashby", companySlug: m[1], jobId: m[2] };
  return null;
}

async function fetchSingleGreenhouseJob(endpoint: string, jobId: string): Promise<Record<string, unknown>> {
  const url = endpoint.replace(/\/jobs(?:\?content=true)?$/, `/jobs/${jobId}?content=true`);
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new HttpError(res.status, `Greenhouse ${res.status}`);
  return res.json() as Promise<Record<string, unknown>>;
}

async function fetchSingleLeverJob(endpoint: string, jobId: string): Promise<Record<string, unknown>> {
  const url = endpoint.replace(/\?mode=json$/, `/${jobId}`);
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new HttpError(res.status, `Lever ${res.status}`);
  return res.json() as Promise<Record<string, unknown>>;
}

async function fetchSingleAshbyJob(endpoint: string, jobId: string): Promise<Record<string, unknown>> {
  const url = endpoint.replace(/\?includeCompensation=true$/, `/job/${jobId}`);
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new HttpError(res.status, `Ashby ${res.status}`);
  return res.json() as Promise<Record<string, unknown>>;
}

async function fetchSingleJob(ats: AtsPlatform, endpoint: string, jobId: string): Promise<Record<string, unknown>> {
  switch (ats) {
    case "greenhouse": return fetchSingleGreenhouseJob(endpoint, jobId);
    case "lever": return fetchSingleLeverJob(endpoint, jobId);
    case "ashby": return fetchSingleAshbyJob(endpoint, jobId);
  }
}

export function findRawJobByExternalId(rawJobs: RawJob[], ats: AtsPlatform, jobId: string): RawJob | undefined {
  const candidates = new Set([
    jobId,
    stripAtsPrefix(jobId),
  ]);

  return rawJobs.find((raw) => {
    const rawIds = [
      (raw as any).id,
      (raw as any).jobId,
      (raw as any).externalId,
    ].filter((v) => v !== undefined && v !== null).map((v) => String(v));

    if (rawIds.some((id) => candidates.has(id) || candidates.has(stripAtsPrefix(id)))) {
      return true;
    }

    try {
      const normalized = normalizeJob(raw, ats);
      return candidates.has(normalized.id) || candidates.has(stripAtsPrefix(normalized.id));
    } catch {
      return false;
    }
  });
}

export async function fetchJobFromCompanyEndpoint(ats: AtsPlatform, endpoint: string, jobId: string): Promise<RawJob | null> {
  try {
    const { jobs: rawJobs } = await fetchCompanyJobs(ats, endpoint);
    return findRawJobByExternalId(rawJobs, ats, jobId) || null;
  } catch {
    return null;
  }
}

export async function fetchAndSaveJobFromUrl(url: string): Promise<{ job: JobRecord; saved: boolean; error?: string }> {
  const parsedAts = parseAtsUrl(url);
  const parsed = parsedAts
    ? { ats: parsedAts.ats, companySlug: parsedAts.slug, jobId: parsedAts.jobId || "" }
    : parseJobUrl(url);
  if (!parsed?.jobId) return { job: null as any, saved: false, error: "Unrecognized URL format" };

  const { ats, companySlug, jobId } = parsed;
  const endpoint = parsedAts?.endpoint || endpointForAts(companySlug, ats);

  let company = companies.instance.getBySlug(companySlug);
  if (!company) {
    companies.instance.save({ slug: companySlug, name: companySlug, ats, endpoint });
    company = companies.instance.getBySlug(companySlug);
  }
  if (!company) return { job: null as any, saved: false, error: `Failed to create company: ${companySlug}` };

  const existing = jobs.instance.get(companySlug, jobId);
  if (existing) {
    const job: JobRecord = {
      id: existing.id,
      site: ats,
      title: existing.title,
      company: existing.companyName,
      location: existing.location,
      url: existing.url,
      description: existing.description,
    };
    return { job, saved: true };
  }

  // Try company endpoint list first
  const rawFromList = await fetchJobFromCompanyEndpoint(ats, endpoint, jobId);
  if (rawFromList) {
    const normalized = normalizeJob(rawFromList, ats);
    jobs.instance.save({
      id: normalized.id,
      companyId: company.id,
      externalId: jobId,
      url: normalized.url || url,
      title: normalized.title,
      location: normalized.location,
      description: normalized.description,
      rawJson: rawFromList,
    });
    const job: JobRecord = {
      id: normalized.id,
      site: ats,
      title: normalized.title,
      company: company.name,
      location: normalized.location,
      url: normalized.url,
      description: normalized.description,
    };
    return { job, saved: true };
  }

  // Fallback to single-job fetch
  try {
    const raw = await fetchSingleJob(ats, endpoint, jobId);
    const job = { ...normalizeJob(raw, ats), company: company.name };

    jobs.instance.save({
      id: job.id,
      companyId: company.id,
      externalId: jobId,
      url,
      title: job.title,
      location: job.location,
      description: job.description,
      rawJson: raw,
    });

    return { job, saved: true };
  } catch (err: any) {
    jobs.instance.save({
      id: `${ats}-${jobId}`,
      companyId: company.id,
      externalId: jobId,
      url,
      title: "",
      location: "",
      description: "",
    });

    const fallback: JobRecord = {
      id: `${ats}-${jobId}`,
      site: ats,
      title: "",
      company: companySlug,
      location: "",
      url,
      description: "",
    };
    return { job: fallback, saved: true, error: err.message };
  }
}

export async function refetchJobById(jobId: string): Promise<{ job: JobRecord; source: "company_endpoint" | "single_job_fallback" }> {
  const saved = jobs.instance.getById(jobId);
  if (!saved) throw new Error(`Job not found: ${jobId}`);

  const company = companies.instance.getById(saved.companyId);
  if (!company) throw new Error(`Company not found for job: ${jobId}`);

  const ats = saved.ats as AtsPlatform;
  const endpoint = company.endpoint || endpointForAts(company.slug, ats);

  // Try company endpoint list first
  const rawFromList = await fetchJobFromCompanyEndpoint(ats, endpoint, saved.externalId);
  if (rawFromList) {
    const normalized = normalizeJob(rawFromList, ats);
    jobs.instance.save({
      id: jobId,
      companyId: saved.companyId,
      externalId: saved.externalId,
      url: normalized.url || saved.url,
      title: normalized.title,
      location: normalized.location,
      description: normalized.description,
      rawJson: rawFromList,
    });

    const job: JobRecord = {
      id: jobId,
      site: ats,
      title: normalized.title,
      company: company.name,
      location: normalized.location,
      url: normalized.url,
      description: normalized.description,
    };
    return { job, source: "company_endpoint" };
  }

  // Fallback to single-job fetch
  const raw = await fetchSingleJob(ats, endpoint, saved.externalId);
  const normalized = normalizeJob(raw, ats);
  jobs.instance.save({
    id: jobId,
    companyId: saved.companyId,
    externalId: saved.externalId,
    url: normalized.url || saved.url,
    title: normalized.title,
    location: normalized.location,
    description: normalized.description,
    rawJson: raw,
  });

  const job: JobRecord = {
    id: jobId,
    site: ats,
    title: normalized.title,
    company: company.name,
    location: normalized.location,
    url: normalized.url,
    description: normalized.description,
  };
  return { job, source: "single_job_fallback" };
}

export { normalizeJob } from "./normalize/index";
export { computeContentHash } from "./sync/classify";

function extractExternalId(job: JobRecord): string {
  if (job.id.startsWith("gh-")) return job.id.slice(3);
  if (job.id.startsWith("lever-")) return job.id.slice(6);
  if (job.id.startsWith("ashby-")) return job.id.slice(6);
  return job.id;
}

function stripAtsPrefix(id: string): string {
  if (id.startsWith("gh-")) return id.slice(3);
  if (id.startsWith("lever-")) return id.slice(6);
  if (id.startsWith("ashby-")) return id.slice(6);
  return id;
}

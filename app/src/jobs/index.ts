import type { AtsPlatform, JobRecord } from "../shared/types";
import { companies, savedJobs } from "../db";
import { normalizeJob } from "./parser";
import { APP_ROOT } from "../shared/index";
import { join } from "path";
import { mkdirSync } from "fs";
import { HttpError } from "./errors";

const JOBS_DIR = join(APP_ROOT, "data", "jobs");

type RawJob = Record<string, unknown>;

export async function fetchAllJobs(): Promise<JobRecord[]> {
  const allCompanies = companies.instance.getActive();
  console.log(`[fetch] Fetching jobs from ${allCompanies.length} companies...`);
  const allNewJobs: JobRecord[] = [];

  for (const company of allCompanies) {
    try {
      const rawJobs = await fetchCompanyJobs(company.ats as AtsPlatform, company.slug);
      const normalized = rawJobs.map((raw) => normalizeJob(raw, company.ats as AtsPlatform));

      for (const job of normalized) {
        cacheJobDescription(job);

        const parsed = parseJobUrl(job.url);
        if (parsed) {
          savedJobs.instance.save({ companySlug: parsed.companySlug, jobId: parsed.jobId, url: job.url, title: job.title, location: job.location, description: job.description });
        }

        allNewJobs.push(job);
      }

      companies.instance.updateFetchedAt(company.slug);
      console.log(`[fetch] ${company.name}: ${normalized.length} jobs`);
    } catch (err: any) {
      if (err instanceof HttpError && err.status === 404) {
        console.warn(`[fetch] ${company.name} (${company.slug}) returned 404 — deactivating`);
        companies.instance.deactivate(company.slug);
      } else {
        console.warn(`[fetch] Failed for ${company.name} (${company.slug}): ${err.message}`);
      }
    }

    await delay(1000 + Math.random() * 1000);
  }

  console.log(`[fetch] Total ${allNewJobs.length} new jobs found`);
  return allNewJobs;
}

async function fetchCompanyJobs(ats: AtsPlatform, slug: string): Promise<RawJob[]> {
  switch (ats) {
    case "greenhouse": return fetchGreenhouseJobs(slug);
    case "lever": return fetchLeverJobs(slug);
    case "ashby": return fetchAshbyJobs(slug);
    default: throw new Error(`Unknown ATS: ${ats}`);
  }
}

async function fetchGreenhouseJobs(slug: string): Promise<RawJob[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`;
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new HttpError(res.status, `Greenhouse ${res.status}`);
  const json = (await res.json()) as { jobs?: RawJob[] };
  return json.jobs || [];
}

async function fetchLeverJobs(slug: string): Promise<RawJob[]> {
  const url = `https://api.lever.co/v0/postings/${slug}?mode=json`;
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new HttpError(res.status, `Lever ${res.status}`);
  const json = (await res.json()) as RawJob[];
  return Array.isArray(json) ? json : [];
}

async function fetchAshbyJobs(slug: string): Promise<RawJob[]> {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${slug}?includeCompensation=true`;
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new HttpError(res.status, `Ashby ${res.status}`);
  const json = (await res.json()) as { jobs?: RawJob[] };
  return json.jobs || [];
}

function cacheJobDescription(job: JobRecord): void {
  const dir = join(JOBS_DIR, job.id);
  mkdirSync(dir, { recursive: true });
  const { writeFileSync } = require("fs");
  writeFileSync(join(dir, "jd.md"), job.description, "utf-8");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── URL parsing & single-job fetch ──

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

async function fetchSingleGreenhouseJob(slug: string, jobId: string): Promise<Record<string, unknown>> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs/${jobId}?content=true`;
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new HttpError(res.status, `Greenhouse ${res.status}`);
  return res.json() as Promise<Record<string, unknown>>;
}

async function fetchSingleLeverJob(slug: string, jobId: string): Promise<Record<string, unknown>> {
  const url = `https://api.lever.co/v0/postings/${slug}/${jobId}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new HttpError(res.status, `Lever ${res.status}`);
  return res.json() as Promise<Record<string, unknown>>;
}

async function fetchSingleAshbyJob(slug: string, jobId: string): Promise<Record<string, unknown>> {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${slug}/job/${jobId}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new HttpError(res.status, `Ashby ${res.status}`);
  return res.json() as Promise<Record<string, unknown>>;
}

async function fetchSingleJob(ats: AtsPlatform, companySlug: string, jobId: string): Promise<Record<string, unknown>> {
  switch (ats) {
    case "greenhouse": return fetchSingleGreenhouseJob(companySlug, jobId);
    case "lever": return fetchSingleLeverJob(companySlug, jobId);
    case "ashby": return fetchSingleAshbyJob(companySlug, jobId);
  }
}

export async function fetchAndSaveJobFromUrl(url: string): Promise<{ job: JobRecord; saved: boolean; error?: string }> {
  const parsed = parseJobUrl(url);
  if (!parsed) return { job: null as any, saved: false, error: "Unrecognized URL format" };

  const { ats, companySlug, jobId } = parsed;

  const existing = savedJobs.instance.get(companySlug, jobId);
  if (existing) {
    const job: JobRecord = {
      id: `${ats}-${jobId}`,
      site: ats,
      title: existing.title,
      company: companySlug,
      location: existing.location,
      url: existing.url,
      description: existing.description,
    };
    return { job, saved: true };
  }

  try {
    const raw = await fetchSingleJob(ats, companySlug, jobId);
    const job = normalizeJob(raw, ats);

    savedJobs.instance.save({ companySlug, jobId, url, title: job.title, location: job.location, description: job.description });

    return { job, saved: true };
  } catch (err: any) {
    savedJobs.instance.save({ companySlug, jobId, url, title: "", location: "", description: "" });

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

import type { AtsPlatform, JobRecord } from "../shared/types";
import { getActiveCompanies, updateCompanyFetchedAt, isJobSeen, markJobSeen, deactivateCompany } from "../shared/db";
import { normalizeJob } from "./parser";
import { APP_ROOT } from "../shared/index";
import { join } from "path";
import { mkdirSync } from "fs";
import { HttpError } from "./errors";

const JOBS_DIR = join(APP_ROOT, "data", "jobs");

type RawJob = Record<string, unknown>;

export async function fetchAllJobs(): Promise<JobRecord[]> {
  const companies = getActiveCompanies();
  console.log(`[fetch] Fetching jobs from ${companies.length} companies...`);
  const allNewJobs: JobRecord[] = [];

  for (const company of companies) {
    try {
      const rawJobs = await fetchCompanyJobs(company.ats as AtsPlatform, company.slug);
      const normalized = rawJobs.map((raw) => normalizeJob(raw, company.ats as AtsPlatform));
      const newJobs = normalized.filter((j) => !isJobSeen(j.title, j.company));

      for (const job of newJobs) {
        markJobSeen(job.title, job.company);
        cacheJobDescription(job);
        allNewJobs.push(job);
      }

      updateCompanyFetchedAt(company.slug);
      console.log(`[fetch] ${company.name}: ${normalized.length} jobs, ${newJobs.length} new`);
    } catch (err: any) {
      if (err instanceof HttpError && err.status === 404) {
        console.warn(`[fetch] ${company.name} (${company.slug}) returned 404 — deactivating`);
        deactivateCompany(company.slug);
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

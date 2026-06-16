import type { JobRecord, FilteredJob, SearchConfig, SavedJob } from "../shared/types";
import { OpenCodeClient } from "../shared/llm";
import { buildFilterPrompt } from "../shared/prompts";
import { safeParseFilter } from "../schemas/index";
import { readText } from "../shared/utils";
import { SKILLS_DIR, slug, createClient } from "../shared/index";
import { join } from "path";
import { jobFilters, companies, jobs } from "../db";
import { syncJobs } from "../jobs/index";
import type { JobSyncResult } from "../jobs/sync/types";
import { loadSearchConfig } from "../shared/config";

const FILTER_MD = join(SKILLS_DIR, "job_filter.md");

export async function filterJob(client: OpenCodeClient, job: JobRecord, filterMd: string, targetCompanies?: string[]): Promise<FilteredJob | null> {
  const prompt = buildFilterPrompt(job, filterMd, targetCompanies);

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const filter = await client.filterJob(prompt.system, prompt.user);
      const parsed = safeParseFilter(filter);

      if (parsed.success) {
        return { job, filter: parsed.data };
      }

      if (attempt < 3) {
        console.log(`[filter] Parse failed for ${job.company} - ${job.title}, attempt ${attempt}/3, retrying...`);
        prompt.user += "\n\nRespond with valid JSON matching this schema: { verdict, score, reasons, must_have_hits, missing }. STRICT: Return ONLY a JSON object.";
      }
    } catch (err: any) {
      console.warn(`[filter] Error attempt ${attempt} for ${job.company}: ${err.message}`);
      if (attempt < 3) {
        await delay(1000);
      }
    }
  }

  console.warn(`[filter] Skipped ${job.company} - ${job.title} after 3 attempts`);
  return null;
}

export async function filterJobs(client: OpenCodeClient, jobsList: JobRecord[], config?: SearchConfig): Promise<FilteredJob[]> {
  const filterMd = readText(FILTER_MD);
  const targetCompanies = config?.targetCompanies?.filter(Boolean) || [];
  const results: FilteredJob[] = [];

  for (const [index, job] of jobsList.entries()) {
    console.log(`[filter] ${index + 1}/${jobsList.length}: ${job.company} - ${job.title}`);
    const result = await filterJob(client, job, filterMd, targetCompanies);
    if (result) {
      results.push(result);
    }
  }

  console.log(`[filter] ${results.length}/${jobsList.length} jobs passed filter`);
  return results;
}

export async function saveFilterResults(results: FilteredJob[]): Promise<void> {
  for (const r of results) {
    await jobFilters.instance.save({
      id: `filter-${r.job.id}-${Date.now()}`,
      jobId: r.job.id,
      contentHash: "",
      verdict: r.filter.verdict,
      score: r.filter.score,
      reasons: r.filter.reasons,
      mustHaveHits: r.filter.must_have_hits,
      missingItems: r.filter.missing,
    });
  }
}

export type CandidateFilterSummary = {
  total: number;
  processed: number;
  skippedExisting: number;
  skippedClosed: number;
  accepted: number;
  rejected: number;
  minScore: number;
};

export type CandidateFilterRun = {
  summary: CandidateFilterSummary;
  results: FilteredJob[];
};

export type CandidateFilterOptions = {
  limit?: number;
  force?: boolean;
  companySlug?: string;
  includeClosed?: boolean;
};

export function normalFilterJob(job: JobRecord, config: SearchConfig): FilteredJob {
  const roleHits = findTermHits(config.roles, `${job.title}\n${job.description}`);
  const titleRoleHits = findTermHits(config.roles, job.title);
  const locationHits = findTermHits(config.location, `${job.location}\n${job.description}`);
  const excludeHits = findTermHits(config.exclude, `${job.title}\n${job.description}`);
  const targetCompanyHit = config.targetCompanies.some((name) => termMatches(name, job.company));

  const hasRemoteSignal = /remote|worldwide|global|emea|anywhere|distributed/i.test(`${job.location}\n${job.description}`);
  const hasDescription = job.description.trim().length > 200;

  let score = 0;
  score += Math.min(titleRoleHits.length * 25, 45);
  score += Math.min(roleHits.length * 10, 25);
  score += Math.min(locationHits.length * 15, 25);
  if (hasRemoteSignal) score += 10;
  if (targetCompanyHit) score += 10;
  if (hasDescription) score += 5;
  if (job.url) score += 5;
  score -= Math.min(excludeHits.length * 30, 60);
  score = Math.max(0, Math.min(100, score));

  const missing: string[] = [];
  if (roleHits.length === 0) missing.push("No configured role keyword matched");
  if (locationHits.length === 0 && !hasRemoteSignal) missing.push("No configured location or remote keyword matched");
  if (excludeHits.length > 0) missing.push(`Excluded keyword(s): ${excludeHits.join(", ")}`);

  const reasons: string[] = [];
  if (roleHits.length > 0) reasons.push(`Role match: ${roleHits.slice(0, 4).join(", ")}`);
  if (locationHits.length > 0) reasons.push(`Location match: ${locationHits.slice(0, 4).join(", ")}`);
  if (hasRemoteSignal && locationHits.length === 0) reasons.push("Remote/global signal found");
  if (targetCompanyHit) reasons.push("Company is in target companies");
  if (excludeHits.length > 0) reasons.push(`Rejected by exclude keyword: ${excludeHits.join(", ")}`);
  if (!hasDescription) reasons.push("Description is short or missing");

  const verdict = score >= config.min_score && roleHits.length > 0 && excludeHits.length === 0 ? "accept" : "reject";

  return {
    job,
    filter: {
      verdict,
      score,
      reasons,
      must_have_hits: [...new Set([...roleHits, ...locationHits, ...(hasRemoteSignal ? ["remote/global"] : [])])],
      missing,
    },
  };
}

export async function runCandidateFilterLoop(options: CandidateFilterOptions = {}, config?: SearchConfig): Promise<CandidateFilterRun> {
  const cfg = config || await loadSearchConfig();
  const allJobs = options.companySlug
    ? await jobs.instance.getByCompany(options.companySlug)
    : await jobs.instance.getAll();

  console.log(
    [
      "[normal-filter] Starting candidate loop",
      `scope=${options.companySlug || "all"}`,
      `limit=${options.limit ?? 0}`,
      `force=${Boolean(options.force)}`,
      `includeClosed=${Boolean(options.includeClosed)}`,
      `minScore=${cfg.min_score}`,
      `total=${allJobs.length}`,
    ].join(" "),
  );

  const summary: CandidateFilterSummary = {
    total: allJobs.length,
    processed: 0,
    skippedExisting: 0,
    skippedClosed: 0,
    accepted: 0,
    rejected: 0,
    minScore: cfg.min_score,
  };
  const results: FilteredJob[] = [];
  const limit = Math.max(0, options.limit ?? 0);

  for (const row of allJobs) {
    if (limit > 0 && summary.processed >= limit) break;
    if (!options.includeClosed && row.status === "closed") {
      summary.skippedClosed += 1;
      console.log(`[normal-filter] skip closed job=${row.id} company=${row.companyName} title="${row.title}"`);
      continue;
    }
    if (!options.force && (await jobFilters.instance.getByJobId(row.id)).length > 0) {
      summary.skippedExisting += 1;
      console.log(`[normal-filter] skip existing job=${row.id} company=${row.companyName} title="${row.title}"`);
      continue;
    }

    const result = normalFilterJob(savedJobToJobRecord(row), cfg);
    await saveNormalFilterResult(row.id, row.contentHash, result, summary.processed);

    summary.processed += 1;
    if (result.filter.verdict === "accept") summary.accepted += 1;
    else summary.rejected += 1;
    results.push(result);

    console.log(
      [
        `[normal-filter] ${result.filter.verdict}`,
        `score=${result.filter.score}`,
        `job=${row.id}`,
        `company=${row.companyName}`,
        `title="${row.title}"`,
        result.filter.must_have_hits.length ? `hits=${result.filter.must_have_hits.join("|")}` : "hits=none",
        result.filter.missing.length ? `missing=${result.filter.missing.join("|")}` : "missing=none",
      ].join(" "),
    );
  }

  console.log(
    [
      "[normal-filter] Candidate loop done",
      `processed=${summary.processed}`,
      `accepted=${summary.accepted}`,
      `rejected=${summary.rejected}`,
      `skippedExisting=${summary.skippedExisting}`,
      `skippedClosed=${summary.skippedClosed}`,
    ].join(" "),
  );

  return { summary, results };
}

export async function saveNormalFilterResult(jobId: string, contentHash: string, result: FilteredJob, sequence = 0): Promise<void> {
  console.log(
    `[normal-filter] save job=${jobId} verdict=${result.filter.verdict} score=${result.filter.score} contentHash=${contentHash || "none"}`,
  );

  await jobFilters.instance.save({
    id: `normal-filter-${jobId}-${Date.now()}-${sequence}`,
    jobId,
    contentHash,
    verdict: result.filter.verdict,
    score: result.filter.score,
    reasons: result.filter.reasons,
    mustHaveHits: result.filter.must_have_hits,
    missingItems: result.filter.missing,
    model: "deterministic",
    promptVersion: "normal-filter-v1",
  });
}

function savedJobToJobRecord(job: SavedJob): JobRecord {
  return {
    id: job.id,
    site: job.ats || "",
    title: job.title,
    company: job.companyName,
    location: job.location,
    url: job.url,
    description: job.description,
  };
}

function findTermHits(terms: string[], text: string): string[] {
  return [...new Set(terms.filter((term) => termMatches(term, text)))];
}

function termMatches(term: string, text: string): boolean {
  const normalizedTerm = term.trim();
  if (!normalizedTerm) return false;
  const compactTerm = normalizedTerm.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const compactText = text.toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (compactTerm.length >= 4 && compactText.includes(compactTerm)) return true;
  const escaped = normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
  return new RegExp(`\\b${escaped}\\b`, "i").test(text);
}

export async function syncAndFilter(client?: OpenCodeClient, config?: SearchConfig): Promise<{
  sync: JobSyncResult;
  filtered: FilteredJob[];
}> {
  const c = client || createClient();
  const cfg = config || await loadSearchConfig();

  const sync = await syncJobs();
  const candidates = [...sync.newJobs, ...sync.changedJobs];
  console.log(`[sync] ${candidates.length} candidates to filter (${sync.newJobs.length} new, ${sync.changedJobs.length} changed)`);

  const filtered = await filterJobs(c, candidates, cfg);
  await saveFilterResults(filtered);

  return { sync, filtered };
}

export async function searchJobsWithCriteria(criteria: {
  roles?: string[];
  levels?: string[];
  location?: string;
  ats?: string[];
}): Promise<FilteredJob[]> {
  console.log("[filter] Search with criteria:", criteria);

  const config = await loadSearchConfig();

  const mergedRoles = criteria.roles?.length ? criteria.roles : config.roles;
  const mergedLocation = criteria.location || config.location.join(", ");
  const mergedAts = criteria.ats?.length ? criteria.ats : config.ats;

  const allCompanies = await companies.instance.getActive();
  const targetCompanies = allCompanies.filter((c) => mergedAts.includes(c.ats));
  if (targetCompanies.length === 0) {
    console.log("[filter] No companies match the ATS criteria");
    return [];
  }

  const criteriaParts: string[] = [];
  criteriaParts.push(`Roles: ${mergedRoles.join(", ")}`);
  criteriaParts.push(`Location: ${mergedLocation}`);
  if (criteria.levels?.length) criteriaParts.push(`Levels: ${criteria.levels.join(", ")}`);

  const customFilterMd = [
    "You are a job filter. Evaluate jobs based on these criteria:",
    ...criteriaParts,
    "",
    `Respond with JSON only: { "verdict": "accept"|"reject", "score": 0-100, "reasons": [string], "must_have_hits": [string], "missing": [string] }`,
    "- Accept jobs that match the criteria above.",
    "- Score reflects how well the job matches (80+ = strong match, 60-79 = partial, below 60 = weak).",
    "- reasons: why this job matches or doesn't.",
    "- must_have_hits: which criteria were met.",
    "- missing: which criteria were missing.",
  ].join("\n");

  const targetSlugs = new Set(targetCompanies.map((c) => c.slug));
  const client = createClient();
  const results: FilteredJob[] = [];

  const sync = await syncJobs();
  const allJobs = [...sync.newJobs, ...sync.changedJobs];
  if (allJobs.length === 0) return [];

  const relevantJobs = allJobs.filter((j) => targetSlugs.has(slug(j.company)));
  if (relevantJobs.length === 0) return [];

  for (const [index, job] of relevantJobs.entries()) {
    console.log(`[filter] Search filter ${index + 1}/${relevantJobs.length}: ${job.company} - ${job.title}`);
    try {
      const result = await filterJob(client, job, customFilterMd);
      if (result && result.filter.verdict === "accept" && result.filter.score >= config.min_score) {
        results.push(result);
      }
    } catch (err: any) {
      console.warn(`[filter] Search filter error for ${job.company}: ${err.message}`);
    }
  }

  results.sort((a, b) => b.filter.score - a.filter.score);
  console.log(`[filter] Search found ${results.length} matching jobs`);
  return results;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

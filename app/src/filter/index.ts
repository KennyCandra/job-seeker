import type { JobRecord, FilteredJob, SearchConfig } from "../shared/types";
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
export const NORMAL_FILTER_PROMPT_VERSION = "normal-filter-keyword-v1";

const PREFILTER_ROLE_KEYWORDS = [
  "backend",
  "back end",
  "back-end",
  "backend engineer",
  "back end engineer",
  "back-end engineer",
  "backend developer",
  "back end developer",
  "back-end developer",
  "frontend",
  "front end",
  "front-end",
  "frontend engineer",
  "front end engineer",
  "front-end engineer",
  "frontend developer",
  "front end developer",
  "front-end developer",
  "fullstack",
  "full stack",
  "full-stack",
  "fullstack engineer",
  "full stack engineer",
  "full-stack engineer",
  "software engineer",
  "software developer",
  "web developer",
  "web engineer",
];

const PREFILTER_REJECT_TITLE_KEYWORDS = [
  "senior",
  "sr",
  "staff",
  "principal",
  "lead",
  "manager",
  "director",
  "head",
  "architect",
];

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

export type CandidateFilterOptions = {
  limit?: number;
  force?: boolean;
  companySlug?: string;
  includeClosed?: boolean;
};

export type NormalFilterCandidate = {
  jobId: string;
  companyName: string;
  title: string;
  contentHash: string;
};

export async function getNormalFilterCandidates(
  options: CandidateFilterOptions,
): Promise<{ candidates: NormalFilterCandidate[]; skipped: number; skippedClosed: number; skippedExisting: number }> {
  const allJobs = options.companySlug
    ? await jobs.instance.getByCompany(options.companySlug)
    : await jobs.instance.getAll();

  const candidates: NormalFilterCandidate[] = [];
  let skipped = 0;
  let skippedClosed = 0;
  let skippedExisting = 0;
  const limit = Math.max(0, options.limit ?? 0);

  for (const row of allJobs) {
    if (limit > 0 && candidates.length >= limit) break;
    if (!options.includeClosed && row.status === "closed") {
      skippedClosed++;
      continue;
    }
    if (!options.force) {
      const existing = await jobFilters.instance.getByJobId(row.id);
      if (existing.some((filter) => filter.promptVersion === NORMAL_FILTER_PROMPT_VERSION && filter.contentHash === row.contentHash)) {
        skippedExisting++;
        continue;
      }
    }
    candidates.push({ jobId: row.id, companyName: row.companyName, title: row.title, contentHash: row.contentHash });
  }

  skipped = skippedClosed + skippedExisting;
  return { candidates, skipped, skippedClosed, skippedExisting };
}

export function normalFilterJob(job: JobRecord, config: SearchConfig): FilteredJob {
  const roleTerms = uniqueTerms([...PREFILTER_ROLE_KEYWORDS, ...config.roles]);
  const rejectTitleTerms = uniqueTerms([...PREFILTER_REJECT_TITLE_KEYWORDS, ...config.exclude]);
  const titleRoleHits = findTermHits(roleTerms, job.title);
  const roleHits = findTermHits(roleTerms, `${job.title}\n${job.description}`);
  const rejectHits = findTermHits(rejectTitleTerms, job.title);

  const hasTitleRoleHit = titleRoleHits.length > 0;
  const hasAnyRoleHit = roleHits.length > 0;
  const hasRejectHit = rejectHits.length > 0;
  const verdict = hasAnyRoleHit && !hasRejectHit ? "accept" : "reject";
  const score = verdict === "accept" ? (hasTitleRoleHit ? 90 : 75) : 0;

  const missing: string[] = [];
  if (!hasAnyRoleHit) missing.push("No backend/frontend/software role keyword matched");
  if (hasRejectHit) missing.push(`Rejected seniority/title keyword(s): ${rejectHits.join(", ")}`);

  const reasons: string[] = [];
  if (titleRoleHits.length > 0) reasons.push(`Title keyword match: ${titleRoleHits.slice(0, 5).join(", ")}`);
  else if (roleHits.length > 0) reasons.push(`Description keyword match: ${roleHits.slice(0, 5).join(", ")}`);
  if (hasRejectHit) reasons.push(`Rejected by title keyword: ${rejectHits.join(", ")}`);

  return {
    job,
    filter: {
      verdict,
      score,
      reasons,
      must_have_hits: roleHits,
      missing,
    },
  };
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
    promptVersion: NORMAL_FILTER_PROMPT_VERSION,
  });
}

function findTermHits(terms: string[], text: string): string[] {
  return [...new Set(terms.filter((term) => termMatches(term, text)))];
}

function uniqueTerms(terms: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const term of terms) {
    const normalized = term.trim().toLowerCase();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(term.trim());
  }
  return result;
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

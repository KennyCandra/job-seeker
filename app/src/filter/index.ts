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
export const NORMAL_FILTER_PROMPT_VERSION = "normal-filter-scoring-v1";

type WeightedTerm = {
  term: string;
  weight: number;
};

const HARD_REJECT_TITLE_TERMS = [
  "staff",
  "principal",
  "director",
  "head of",
  "engineering manager",
  "product manager",
  "project manager",
  "qa engineer",
  "manual qa",
  "data scientist",
  "data analyst",
  "ios engineer",
  "android engineer",
  "mobile engineer",
  "wordpress developer",
  "php developer",
];

const HARD_REJECT_TEXT_TERMS = [
  "internship",
  "working student",
  "student worker",
  "unpaid",
  "volunteer",
  "commission only",
  "native german",
  "native french",
  "native dutch",
  "fluent german required",
  "security clearance",
  "active clearance",
  "secret clearance",
  "top secret clearance",
  "us citizen",
  "u.s. citizen",
];

const TITLE_STRONG_TERMS: WeightedTerm[] = [
  { term: "backend engineer", weight: 42 },
  { term: "back end engineer", weight: 42 },
  { term: "back-end engineer", weight: 42 },
  { term: "backend developer", weight: 38 },
  { term: "back end developer", weight: 38 },
  { term: "back-end developer", weight: 38 },
  { term: "node.js engineer", weight: 38 },
  { term: "node engineer", weight: 36 },
  { term: "typescript engineer", weight: 34 },
  { term: "api engineer", weight: 32 },
];

const TITLE_GOOD_TERMS: WeightedTerm[] = [
  { term: "software engineer", weight: 30 },
  { term: "software developer", weight: 28 },
  { term: "fullstack engineer", weight: 30 },
  { term: "full stack engineer", weight: 30 },
  { term: "full-stack engineer", weight: 30 },
  { term: "fullstack developer", weight: 28 },
  { term: "full stack developer", weight: 28 },
  { term: "full-stack developer", weight: 28 },
  { term: "platform engineer", weight: 24 },
  { term: "web engineer", weight: 18 },
  { term: "web developer", weight: 16 },
];

const TITLE_PENALTY_TERMS: WeightedTerm[] = [
  { term: "senior", weight: -12 },
  { term: "sr", weight: -12 },
  { term: "lead", weight: -18 },
  { term: "manager", weight: -28 },
  { term: "architect", weight: -24 },
  { term: "frontend", weight: -16 },
  { term: "front end", weight: -16 },
  { term: "front-end", weight: -16 },
  { term: "react native", weight: -24 },
  { term: "mobile", weight: -30 },
  { term: "ios", weight: -30 },
  { term: "android", weight: -30 },
];

const REQUIRED_TECH_TERMS: WeightedTerm[] = [
  { term: "node.js", weight: 12 },
  { term: "nodejs", weight: 12 },
  { term: "node", weight: 10 },
  { term: "typescript", weight: 12 },
  { term: "javascript", weight: 8 },
  { term: "postgresql", weight: 12 },
  { term: "postgres", weight: 12 },
  { term: "rest api", weight: 10 },
  { term: "api", weight: 6 },
  { term: "express", weight: 8 },
  { term: "nestjs", weight: 8 },
  { term: "backend", weight: 8 },
  { term: "microservices", weight: 7 },
];

const NICE_TECH_TERMS: WeightedTerm[] = [
  { term: "redis", weight: 6 },
  { term: "bullmq", weight: 6 },
  { term: "queue", weight: 5 },
  { term: "event driven", weight: 5 },
  { term: "docker", weight: 6 },
  { term: "aws", weight: 6 },
  { term: "gcp", weight: 6 },
  { term: "cloud run", weight: 5 },
  { term: "lambda", weight: 5 },
  { term: "pub/sub", weight: 5 },
  { term: "ci/cd", weight: 4 },
  { term: "jest", weight: 4 },
  { term: "testing", weight: 4 },
  { term: "supabase", weight: 4 },
  { term: "graphql", weight: 5 },
];

const LOCATION_POSITIVE_TERMS = ["remote", "emea", "europe", "worldwide", "global", "relocation"];
const LOCATION_NEGATIVE_TERMS = ["us only", "u.s. only", "onsite only", "on-site only", "hybrid only"];

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
  const title = job.title || "";
  const description = job.description || "";
  const location = job.location || "";
  const fullText = `${title}\n${description}\n${location}`;
  const minScore = Number.isFinite(Number(config.min_score)) ? Number(config.min_score) : 65;

  const configRoleTerms = (config.roles || []).map((term) => ({ term, weight: 34 }));
  const titleRoleHits = collectWeightedHits([...configRoleTerms, ...TITLE_STRONG_TERMS, ...TITLE_GOOD_TERMS], title);
  const descriptionRoleHits = collectWeightedHits([...configRoleTerms, ...TITLE_STRONG_TERMS, ...TITLE_GOOD_TERMS], description, 18);
  const requiredTechHits = collectWeightedHits(REQUIRED_TECH_TERMS, fullText, 35);
  const niceTechHits = collectWeightedHits(NICE_TECH_TERMS, fullText, 20);
  const locationPositiveHits = findTermHits(uniqueTerms([...LOCATION_POSITIVE_TERMS, ...(config.location || [])]), `${location}\n${description}`);
  const locationNegativeHits = findTermHits(LOCATION_NEGATIVE_TERMS, `${location}\n${description}`);

  const configuredRejectTitleHits = findTermHits(config.exclude || [], title);
  const hardTitleHits = findTermHits(uniqueTerms([...HARD_REJECT_TITLE_TERMS, ...configuredRejectTitleHits]), title);
  const hardTextHits = findTermHits(HARD_REJECT_TEXT_TERMS, fullText);

  const titlePenaltyHits = collectWeightedHits(TITLE_PENALTY_TERMS, title);
  const frontendOnlyPenalty = isFrontendOnlyTitle(title) ? 18 : 0;
  const experienceScore = scoreExperience(fullText);
  const locationScore = Math.min(15, locationPositiveHits.length * 8) - Math.min(30, locationNegativeHits.length * 15);

  const positiveScore =
    Math.min(45, titleRoleHits.score) +
    (titleRoleHits.hits.length > 0 ? 0 : descriptionRoleHits.score) +
    requiredTechHits.score +
    niceTechHits.score +
    Math.max(0, locationScore) +
    experienceScore.positive;
  const penaltyScore =
    Math.abs(titlePenaltyHits.score) +
    frontendOnlyPenalty +
    Math.abs(Math.min(0, locationScore)) +
    experienceScore.penalty;
  const rawScore = clampScore(positiveScore - penaltyScore);
  const hardRejectHits = uniqueTerms([...hardTitleHits, ...hardTextHits]);
  const verdict = hardRejectHits.length === 0 && rawScore >= minScore ? "accept" : "reject";
  const score = hardRejectHits.length > 0 ? 0 : rawScore;

  const reasons: string[] = [];
  const missing: string[] = [];

  if (hardRejectHits.length > 0) {
    reasons.push(`Hard blocker: ${hardRejectHits.slice(0, 5).join(", ")}`);
  }
  if (titleRoleHits.hits.length > 0) {
    reasons.push(`Title match: ${titleRoleHits.hits.slice(0, 5).join(", ")}`);
  } else if (descriptionRoleHits.hits.length > 0) {
    reasons.push(`Description role match: ${descriptionRoleHits.hits.slice(0, 5).join(", ")}`);
  }
  if (requiredTechHits.hits.length > 0) {
    reasons.push(`Core tech hits: ${requiredTechHits.hits.slice(0, 7).join(", ")}`);
  }
  if (niceTechHits.hits.length > 0) {
    reasons.push(`Nice-to-have hits: ${niceTechHits.hits.slice(0, 6).join(", ")}`);
  }
  if (locationPositiveHits.length > 0) {
    reasons.push(`Location/work mode match: ${locationPositiveHits.slice(0, 4).join(", ")}`);
  }
  if (titlePenaltyHits.hits.length > 0) {
    reasons.push(`Title penalty: ${titlePenaltyHits.hits.slice(0, 5).join(", ")}`);
  }
  if (locationNegativeHits.length > 0) {
    reasons.push(`Location/work mode penalty: ${locationNegativeHits.join(", ")}`);
  }
  if (experienceScore.reasons.length > 0) {
    reasons.push(...experienceScore.reasons);
  }

  if (titleRoleHits.hits.length === 0) missing.push("No strong target title match");
  if (requiredTechHits.hits.length === 0) missing.push("No core backend tech matched");
  if (score < minScore && hardRejectHits.length === 0) missing.push(`Score ${score} below min_score ${minScore}`);
  if (frontendOnlyPenalty > 0) missing.push("Frontend-only title without backend/full-stack signal");

  return {
    job,
    filter: {
      verdict,
      score,
      reasons,
      must_have_hits: uniqueTerms([
        ...titleRoleHits.hits,
        ...descriptionRoleHits.hits,
        ...requiredTechHits.hits,
        ...locationPositiveHits,
      ]),
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
  const hits: string[] = [];
  const seen = new Set<string>();
  for (const term of terms) {
    const key = termKey(term);
    if (!key || seen.has(key)) continue;
    if (!termMatches(term, text)) continue;
    seen.add(key);
    hits.push(term);
  }
  return hits;
}

function collectWeightedHits(terms: WeightedTerm[], text: string, cap = Number.POSITIVE_INFINITY): { hits: string[]; score: number } {
  const hits: string[] = [];
  let score = 0;
  const seen = new Set<string>();

  for (const item of terms) {
    const normalized = termKey(item.term);
    if (!normalized || seen.has(normalized)) continue;
    if (!termMatches(item.term, text)) continue;
    seen.add(normalized);
    hits.push(item.term);
    score += item.weight;
  }

  if (score > cap) score = cap;
  if (score < -cap) score = -cap;
  return { hits, score };
}

function uniqueTerms(terms: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const term of terms) {
    const normalized = termKey(term);
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(term.trim());
  }
  return result;
}

function termKey(term: string): string {
  return term.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function termMatches(term: string, text: string): boolean {
  const normalizedTerm = term.trim();
  if (!normalizedTerm) return false;
  const compactTerm = normalizedTerm.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const compactText = text.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const hasSeparator = /[^a-z0-9]/i.test(normalizedTerm);
  if (hasSeparator && compactTerm.length >= 4 && compactText.includes(compactTerm)) return true;
  const escaped = normalizedTerm
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/[\s-]+/g, "[\\s-]+");
  return new RegExp(`\\b${escaped}\\b`, "i").test(text);
}

function isFrontendOnlyTitle(title: string): boolean {
  const hasFrontend = ["frontend", "front end", "front-end"].some((term) => termMatches(term, title));
  if (!hasFrontend) return false;
  const hasBackendSignal = [
    "backend",
    "back end",
    "back-end",
    "fullstack",
    "full stack",
    "full-stack",
    "software engineer",
  ].some((term) => termMatches(term, title));
  return !hasBackendSignal;
}

function scoreExperience(text: string): { positive: number; penalty: number; reasons: string[] } {
  const normalized = text.replace(/\s+/g, " ");
  const reasons: string[] = [];

  const moderate = normalized.match(/\b([3-5])\+?\s*(years|yrs)\b/i);
  const heavy = normalized.match(/\b(8|9|10|11|12|15)\+?\s*(years|yrs)\b/i);

  if (heavy) {
    reasons.push(`Experience penalty: ${heavy[0]}`);
    return { positive: 0, penalty: 18, reasons };
  }
  if (moderate) {
    reasons.push(`Experience match: ${moderate[0]}`);
    return { positive: 8, penalty: 0, reasons };
  }

  return { positive: 0, penalty: 0, reasons };
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, Math.round(score)));
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

import type { JobRecord, FilterResult, FilteredJob, SearchConfig, ShortlistItem, AtsPlatform } from "../shared/types";
import { OpenCodeClient } from "../shared/llm";
import { buildFilterPrompt } from "../shared/prompts";
import { safeParseFilter } from "../schemas/index";
import { readText } from "../shared/utils";
import { SKILLS_DIR, slug, createClient } from "../shared/index";
import { join } from "path";
import { shortlist, companies } from "../db";
import { loadSearchConfig } from "../shared/config";
import { fetchAllJobs } from "../jobs/index";

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

export async function filterJobs(client: OpenCodeClient, jobs: JobRecord[], config?: SearchConfig): Promise<FilteredJob[]> {
  const filterMd = readText(FILTER_MD);
  const targetCompanies = config?.targetCompanies?.filter(Boolean) || [];
  const results: FilteredJob[] = [];
  const shortlistItems: ShortlistItem[] = [];

  for (const [index, job] of jobs.entries()) {
    console.log(`[filter] ${index + 1}/${jobs.length}: ${job.company} - ${job.title}`);
    const result = await filterJob(client, job, filterMd, targetCompanies);
    if (result) {
      results.push(result);
    }
  }

  console.log(`[filter] ${results.length}/${jobs.length} jobs passed filter`);
  return results;
}

export function saveFilterResults(results: FilteredJob[], ats?: AtsPlatform): ShortlistItem[] {
  shortlist.instance.clear();
  const items: ShortlistItem[] = results.map((r) => ({
    jobId: r.job.id,
    company: r.job.company,
    companySlug: slug(r.job.company),
    title: r.job.title,
    location: r.job.location,
    score: r.filter.score,
    verdict: r.filter.verdict,
    reasons: r.filter.reasons,
    mustHaveHits: r.filter.must_have_hits,
    missingItems: r.filter.missing,
    applyUrl: r.job.url,
    filteredAt: new Date().toISOString(),
  }));

  shortlist.instance.save(items);
  return items;
}

export async function searchJobsWithCriteria(criteria: {
  roles?: string[];
  levels?: string[];
  location?: string;
  ats?: string[];
}): Promise<FilteredJob[]> {
  console.log("[filter] Search with criteria:", criteria);

  const config = loadSearchConfig();

  const mergedRoles = criteria.roles?.length ? criteria.roles : config.roles;
  const mergedLocation = criteria.location || config.location.join(", ");
  const mergedAts = criteria.ats?.length ? criteria.ats : config.ats;

  const allCompanies = companies.instance.getActive();
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

  const allNewJobs = await fetchAllJobs();
  if (allNewJobs.length === 0) return [];

  const relevantJobs = allNewJobs.filter((j) => targetSlugs.has(slug(j.company)));
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

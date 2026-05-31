import type { JobRecord, FilterResult, FilteredJob, SearchConfig, ShortlistItem, AtsPlatform } from "../shared/types";
import { OpenCodeClient } from "../shared/llm";
import { buildFilterPrompt } from "../shared/prompts";
import { safeParseFilter } from "../schemas/index";
import { readText } from "../shared/utils";
import { SKILLS_DIR, slug } from "../shared/index";
import { join } from "path";
import { saveShortlist, clearShortlist } from "../shared/db";

const FILTER_MD = join(SKILLS_DIR, "job_filter.md");

export async function filterJob(client: OpenCodeClient, job: JobRecord, filterMd: string): Promise<FilteredJob | null> {
  const prompt = buildFilterPrompt(job, filterMd);

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
  const results: FilteredJob[] = [];
  const shortlistItems: ShortlistItem[] = [];

  for (const [index, job] of jobs.entries()) {
    console.log(`[filter] ${index + 1}/${jobs.length}: ${job.company} - ${job.title}`);
    const result = await filterJob(client, job, filterMd);
    if (result) {
      results.push(result);
    }
  }

  console.log(`[filter] ${results.length}/${jobs.length} jobs passed filter`);
  return results;
}

export function saveFilterResults(results: FilteredJob[], ats?: AtsPlatform): ShortlistItem[] {
  clearShortlist();
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

  saveShortlist(items);
  return items;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

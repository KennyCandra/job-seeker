import type { FilteredJob } from "./shared/types";
import { getActiveCompanies } from "./shared/db";
import { runSeed } from "./seed/index";
import { buildDorkQueries, discoverViaPlaywright, saveNewDiscoveredCompanies } from "./discovery/index";
import { fetchAllJobs as fetchAllAtsJobs } from "./jobs/index";
import { filterJobs as runFilter, saveFilterResults } from "./filter/index";
import { makeCvForJob } from "./generator/index";
import { loadSearchConfig } from "./shared/config";
import { createClient } from "./shared/index";

export {
  APP_ROOT, DATA_DIR, OUTPUT_DIR, SKILLS_DIR, JOBS_DIR,
  slug, createClient, getPersonalData, normalizeResumePayload,
  renderApplicationMarkdown, jobDir, generateDocument, extractJobFromText,
} from "./shared/index";

export async function runPipeline(): Promise<FilteredJob[]> {
  console.log("[pipeline] Starting full run");

  const config = loadSearchConfig();

  const newJobs = await fetchAllAtsJobs();
  if (newJobs.length === 0) {
    console.log("[pipeline] No new jobs found");
    return [];
  }

  const client = createClient();
  const results = await runFilter(client, newJobs, config);
  saveFilterResults(results);
  const accepted = results.filter(
    (r) => r.filter.verdict === "accept" && r.filter.score >= config.min_score,
  );
  console.log(`[pipeline] ${accepted.length}/${results.length} jobs above threshold`);

  return accepted;
}

export async function runDiscovery(): Promise<number> {
  const config = loadSearchConfig();
  const queries = buildDorkQueries(config);
  const discovered = await discoverViaPlaywright(queries);
  return saveNewDiscoveredCompanies(discovered);
}

export async function runSeedIfEmpty(): Promise<number> {
  const companies = getActiveCompanies();
  if (companies.length === 0) {
    console.log("[pipeline] No companies in DB, seeding...");
    return runSeed();
  }
  return 0;
}

export { makeCvForJob };

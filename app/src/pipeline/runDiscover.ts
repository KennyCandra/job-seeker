import type { PipelineLogger } from "./index";
import { loadSearchConfig } from "../shared/config";
import { buildDorkQueries, deduplicateResults, discoverViaPlaywright, discoverViaSerpApi, saveDiscoveredCompanies } from "../discovery";
import type { DiscoveredCompany } from "../discovery";

export type DiscoverResult = {
  found: number;
  added: number;
  updated: number;
  unchanged: number;
  queries: number;
  source: "serpapi" | "playwright";
  companies: DiscoveredCompany[];
};

export async function runDiscover(log?: PipelineLogger): Promise<DiscoverResult> {
  log?.({ type: "info", message: "Starting company discovery..." });
  const config = await loadSearchConfig();
  const queries = buildDorkQueries(config);
  const provider = (process.env.DISCOVERY_PROVIDER || "serpapi").toLowerCase();
  const hasSerpApi = Boolean(process.env.SERPAPI_KEY || process.env.SERP_API_KEY);
  const usePlaywright = provider === "playwright";

  if (!hasSerpApi && !usePlaywright) {
    throw new Error("SERPAPI_KEY or SERP_API_KEY is required for company discovery. Set DISCOVERY_PROVIDER=playwright only for local parser debugging.");
  }

  console.log(
    `[discovery] config roles=${config.roles.join("|")} locations=${config.location.join("|")} ats=${config.ats.join("|")} excludes=${config.exclude.join("|")}`,
  );
  console.log(`[discovery] query cap=${process.env.DISCOVERY_MAX_DORK_QUERIES || 30} generated=${queries.length}`);
  log?.({ type: "info", message: `Running ${queries.length} Google dork queries via ${usePlaywright ? "Playwright" : "SerpAPI"}` });

  const discovered = deduplicateResults(usePlaywright
    ? await discoverViaPlaywright(queries)
    : await discoverViaSerpApi(queries));
  console.log(`[discovery] deduplicated companies=${discovered.length}`);
  const saved = await saveDiscoveredCompanies(discovered);
  console.log(`[discovery] save summary found=${saved.found} added=${saved.added} updated=${saved.updated} unchanged=${saved.unchanged}`);

  log?.({ type: "done", message: `Found ${discovered.length} companies, ${saved.added} new, ${saved.updated} updated` });
  return {
    found: discovered.length,
    added: saved.added,
    updated: saved.updated,
    unchanged: saved.unchanged,
    queries: queries.length,
    source: usePlaywright ? "playwright" : "serpapi",
    companies: discovered,
  };
}

import type { PipelineLogger } from "./index";
import { runDiscover } from "./runDiscover";
import { runFetchAndFilter } from "./runFetchAndFilter";
import type { DiscoverResult } from "./runDiscover";
import type { FetchAndFilterResult } from "./runFetchAndFilter";

export type DiscoverFetchFilterResult = {
  discovery: DiscoverResult;
  fetchFilter: FetchAndFilterResult;
};

export async function runDiscoverFetchFilter(log?: PipelineLogger): Promise<DiscoverFetchFilterResult> {
  log?.({ type: "info", message: "Starting full pipeline: discover → fetch → filter..." });

  const discovery = await runDiscover(log);
  const fetchFilter = await runFetchAndFilter(log);

  log?.({ type: "done", message: `Done: ${discovery.added} companies, ${fetchFilter.summary.fetched} jobs, ${fetchFilter.summary.accepted} accepted` });

  return { discovery, fetchFilter };
}
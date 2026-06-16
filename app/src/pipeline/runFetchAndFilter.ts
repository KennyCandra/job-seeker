import type { PipelineLogger } from "./index";
import { syncJobs } from "../jobs/index";
import type { JobSyncResult } from "../jobs/sync/types";
import type { FilteredJob } from "../shared/types";

export type FetchAndFilterResult = {
  sync: JobSyncResult;
  filtered: FilteredJob[];
  accepted: FilteredJob[];
  summary: {
    fetched: number;
    newJobs: number;
    changedJobs: number;
    unchangedJobs: number;
    closedJobs: number;
    filtered: number;
    accepted: number;
  };
};

export async function runFetchAndFilter(log?: PipelineLogger): Promise<FetchAndFilterResult> {
  log?.({ type: "info", message: "Syncing jobs from all companies..." });
  const sync = await syncJobs();

  const totalFetched = sync.companyResults.reduce((s, r) => s + r.fetched, 0);
  log?.({ type: "done", message: `Fetched ${totalFetched} jobs, ${sync.newJobs.length} new, ${sync.changedJobs.length} changed` });

  const candidates = [...sync.newJobs, ...sync.changedJobs];
  if (candidates.length === 0) {
    log?.({ type: "warn", message: "No new or changed jobs found" });
    return {
      sync,
      filtered: [],
      accepted: [],
      summary: {
        fetched: totalFetched,
        newJobs: sync.newJobs.length,
        changedJobs: sync.changedJobs.length,
        unchangedJobs: sync.unchangedJobs.length,
        closedJobs: sync.closedJobs.length,
        filtered: 0,
        accepted: 0,
      },
    };
  }

  log?.({ type: "done", message: `${candidates.length} new/changed jobs saved. AI filtering is manual only.` });

  return {
    sync,
    filtered: [],
    accepted: [],
    summary: {
      fetched: totalFetched,
      newJobs: sync.newJobs.length,
      changedJobs: sync.changedJobs.length,
      unchangedJobs: sync.unchangedJobs.length,
      closedJobs: sync.closedJobs.length,
      filtered: 0,
      accepted: 0,
    },
  };
}

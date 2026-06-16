import type { HandlerFn } from "../../handler";
import { runFetchAndFilter } from "../../../pipeline";

export const syncAllJobsHandler: HandlerFn = async (ctx) => {
  const { log, throwIfCancelled } = ctx;
  await throwIfCancelled();
  const result = await runFetchAndFilter((pl) => {
    log("info", `[sync] ${pl.type}: ${pl.message}`);
  });
  await throwIfCancelled();
  return {
    fetched: result.summary.fetched,
    newJobs: result.summary.newJobs,
    changedJobs: result.summary.changedJobs,
    unchangedJobs: result.summary.unchangedJobs,
    closedJobs: result.summary.closedJobs,
  };
};

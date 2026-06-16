import type { HandlerFn } from "../../handler";
import { runDiscoverFetchFilter } from "../../../pipeline";

export const discoverFetchFilterHandler: HandlerFn = async (ctx) => {
  const { log, throwIfCancelled } = ctx;
  await throwIfCancelled();
  const result = await runDiscoverFetchFilter((pl) => {
    log("info", `[pipeline] ${pl.type}: ${pl.message}`);
  });
  await throwIfCancelled();
  return {
    discovered: result.discovery.added,
    fetched: result.fetchFilter.summary.fetched,
    newJobs: result.fetchFilter.summary.newJobs,
    filtered: result.fetchFilter.summary.filtered,
    accepted: result.fetchFilter.summary.accepted,
  };
};

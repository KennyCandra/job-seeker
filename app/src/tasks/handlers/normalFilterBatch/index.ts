import type { HandlerFn } from "../../handler";
import { runCandidateFilterLoop } from "../../../filter";

export const normalFilterBatchHandler: HandlerFn = async (ctx) => {
  const { log, payload, throwIfCancelled } = ctx;
  const { limit, force, companySlug, includeClosed } = payload as any;
  await throwIfCancelled();
  await log("info", "Running normal filter batch");
  const result = await runCandidateFilterLoop({
    limit: Number(limit) || 0,
    force: Boolean(force),
    companySlug: companySlug || undefined,
    includeClosed: Boolean(includeClosed),
  });
  await throwIfCancelled();
  await log("info", `Normal filter done: ${result.summary.processed} processed, ${result.summary.accepted} accepted`);
  return { summary: result.summary, results: result.results.length };
};

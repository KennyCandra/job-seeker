import type { HandlerFn } from "../../handler";
import { refetchJobById } from "../../../jobs";

export const refetchJobHandler: HandlerFn = async (ctx) => {
  const { log, payload, throwIfCancelled } = ctx;
  const jobId = String(payload.jobId || "");
  if (!jobId) throw new Error("jobId is required");
  log("info", `Refetching job ${jobId}`);
  throwIfCancelled();
  const result = await refetchJobById(jobId);
  throwIfCancelled();
  log("info", `Refetched from ${result.source}`);
  return { jobId, source: result.source, updated: true };
};

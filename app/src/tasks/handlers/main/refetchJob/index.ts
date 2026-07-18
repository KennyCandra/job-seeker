import type { HandlerFn } from "../../../handler";
import { refetchJobById } from "../../../../jobs";

export const refetchJobHandler: HandlerFn = async (ctx) => {
  const { log, payload, throwIfCancelled } = ctx;
  const jobId = String(payload.jobId || "");
  if (!jobId) throw new Error("jobId is required");
  await log("info", `Refetching job ${jobId}`);
  await throwIfCancelled();
  const result = await refetchJobById(jobId);
  await throwIfCancelled();
  await log("info", `Refetched from ${result.source}`);
  return { jobId, source: result.source, updated: true };
};

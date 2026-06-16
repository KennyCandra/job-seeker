import type { HandlerFn } from "../../handler";
import { applications, jobFilters, jobs } from "../../../db";

export const createApplicationHandler: HandlerFn = async (ctx) => {
  const { log, payload, throwIfCancelled } = ctx;
  const jobId = String(payload.jobId || "");
  if (!jobId) throw new Error("jobId is required");
  const jobRow = await jobs.instance.getById(jobId);
  if (!jobRow) throw new Error(`Job not found: ${jobId}`);
  const existing = await applications.instance.getByJobId(jobId);
  if (existing) {
    await log("info", `Application already exists for job ${jobId}`);
    return { created: false, application: existing };
  }
  await throwIfCancelled();
  const filters = await jobFilters.instance.getByJobId(jobId);
  const score = filters.length > 0 ? filters[0].score : 0;
  await applications.instance.saveAcceptedJob({ jobId, score, status: "approved" });
  const app = await applications.instance.getByJobId(jobId);
  await log("info", `Application created for job ${jobId}`);
  return { created: true, application: app };
};

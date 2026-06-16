import type { HandlerFn } from "../../handler";
import { applications, jobFilters, jobs } from "../../../db";

export const createApplicationHandler: HandlerFn = async (ctx) => {
  const { log, payload, throwIfCancelled } = ctx;
  const jobId = String(payload.jobId || "");
  if (!jobId) throw new Error("jobId is required");
  const jobRow = jobs.instance.getById(jobId);
  if (!jobRow) throw new Error(`Job not found: ${jobId}`);
  const existing = applications.instance.getByJobId(jobId);
  if (existing) {
    log("info", `Application already exists for job ${jobId}`);
    return { created: false, application: existing };
  }
  throwIfCancelled();
  const filters = jobFilters.instance.getByJobId(jobId);
  const score = filters.length > 0 ? filters[0].score : 0;
  applications.instance.saveAcceptedJob({ jobId, score, status: "approved" });
  const app = applications.instance.getByJobId(jobId);
  log("info", `Application created for job ${jobId}`);
  return { created: true, application: app };
};

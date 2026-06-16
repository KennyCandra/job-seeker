import type { HandlerFn } from "../../handler";
import { jobs } from "../../../db";
import { normalFilterJob, saveNormalFilterResult } from "../../../filter";
import { loadSearchConfig } from "../../../shared/config";
import type { JobRecord } from "../../../shared/types";

export const normalFilterJobHandler: HandlerFn = async (ctx) => {
  const { log, payload, throwIfCancelled } = ctx;
  const jobId = String(payload.jobId || "");
  if (!jobId) throw new Error("jobId is required");
  const jobRow = jobs.instance.getById(jobId);
  if (!jobRow) throw new Error(`Job not found: ${jobId}`);
  const job: JobRecord = {
    id: jobRow.id,
    site: jobRow.ats || "",
    title: jobRow.title,
    company: jobRow.companyName,
    location: jobRow.location,
    url: jobRow.url,
    description: jobRow.description,
  };
  throwIfCancelled();
  const result = normalFilterJob(job, loadSearchConfig());
  saveNormalFilterResult(jobId, jobRow.contentHash, result);
  log("info", `Job ${jobId}: ${result.filter.verdict} score=${result.filter.score}`);
  return { jobId, verdict: result.filter.verdict, score: result.filter.score };
};

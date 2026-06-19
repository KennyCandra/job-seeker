import type { HandlerFn } from "../../handler";
import { jobs, jobFilters } from "../../../db";
import { NORMAL_FILTER_PROMPT_VERSION, normalFilterJob, saveNormalFilterResult } from "../../../filter";
import { loadSearchConfig } from "../../../shared/config";
import type { JobRecord } from "../../../shared/types";

export const normalFilterJobHandler: HandlerFn = async (ctx) => {
  const { log, payload, throwIfCancelled } = ctx;
  const jobId = String(payload.jobId || "");
  const force = Boolean(payload.force);
  const includeClosed = Boolean(payload.includeClosed);

  if (!jobId) throw new Error("jobId is required");

  const jobRow = await jobs.instance.getById(jobId);
  if (!jobRow) throw new Error(`Job not found: ${jobId}`);

  if (!includeClosed && jobRow.status === "closed") {
    await log("warn", `Job ${jobId} is closed — skipping`);
    return { jobId, skipped: true, reason: "closed" };
  }

  if (!force) {
    const existing = await jobFilters.instance.getByJobId(jobId);
    if (existing.some((filter) => filter.promptVersion === NORMAL_FILTER_PROMPT_VERSION && filter.contentHash === jobRow.contentHash)) {
      await log("info", `Job ${jobId} already has the current keyword prefilter — skipping`);
      return { jobId, skipped: true, reason: "already-filtered-current-version" };
    }
  }

  await throwIfCancelled();

  const job: JobRecord = {
    id: jobRow.id,
    site: jobRow.ats || "",
    title: jobRow.title,
    company: jobRow.companyName,
    location: jobRow.location,
    url: jobRow.url,
    description: jobRow.description,
  };

  const config = await loadSearchConfig();
  const result = normalFilterJob(job, config);
  await saveNormalFilterResult(jobId, jobRow.contentHash, result);

  await log("info", `Job ${jobId}: ${result.filter.verdict} score=${result.filter.score}`);
  return { jobId, skipped: false, verdict: result.filter.verdict, score: result.filter.score };
};

import { join } from "path";
import type { HandlerFn } from "../../handler";
import { jobs, jobFilters } from "../../../db";
import { filterJob } from "../../../filter";
import { createClient } from "../../../shared/client";
import { loadSearchConfig } from "../../../shared/config";
import { SKILLS_DIR } from "../../../shared/paths";
import { readText } from "../../../shared/utils";
import type { JobRecord } from "../../../shared/types";

export const smartFilterJobHandler: HandlerFn = async (ctx) => {
  const { log, payload, throwIfCancelled } = ctx;
  const jobId = String(payload.jobId || "");
  if (!jobId) throw new Error("jobId is required");
  const jobRow = await jobs.instance.getById(jobId);
  if (!jobRow) throw new Error(`Job not found: ${jobId}`);
  const latestFilter = (await jobFilters.instance.getByJobId(jobId))[0];
  if (!latestFilter || latestFilter.verdict !== "accept") throw new Error("Normal filter must accept first");
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
  const client = createClient();
  const filterMd = readText(join(SKILLS_DIR, "job_filter.md"));
  await throwIfCancelled();
  const result = await filterJob(client, job, filterMd, config.targetCompanies);
  if (!result) throw new Error("Smart filter returned no result");
  await jobFilters.instance.save({
    id: `smart-filter-${jobId}-${Date.now()}`,
    jobId,
    contentHash: jobRow.contentHash,
    verdict: result.filter.verdict,
    score: result.filter.score,
    reasons: result.filter.reasons,
    mustHaveHits: result.filter.must_have_hits,
    missingItems: result.filter.missing,
    model: process.env.OPENCODE_MODEL || process.env.LLM_MODEL || "llm",
    promptVersion: "smart-filter-v1",
  });
  await log("info", `Smart filter done: ${result.filter.verdict} score=${result.filter.score}`);
  return { jobId, verdict: result.filter.verdict, score: result.filter.score };
};

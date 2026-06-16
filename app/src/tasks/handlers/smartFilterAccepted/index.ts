import { join } from "path";
import type { HandlerFn } from "../../handler";
import { jobs, jobFilters } from "../../../db";
import { filterJob } from "../../../filter";
import { createClient } from "../../../shared/client";
import { loadSearchConfig } from "../../../shared/config";
import { SKILLS_DIR } from "../../../shared/paths";
import { readText } from "../../../shared/utils";
import type { JobRecord } from "../../../shared/types";

export const smartFilterAcceptedHandler: HandlerFn = async (ctx) => {
  const { log, payload, throwIfCancelled, progress } = ctx;
  const force = payload.force === true;
  const allJobs = jobs.instance.getAll();
  const config = loadSearchConfig();
  const client = createClient();
  const filterMd = readText(join(SKILLS_DIR, "job_filter.md"));
  const summary = { total: allJobs.length, candidates: 0, processed: 0, skippedNotAccepted: 0, skippedExistingSmart: 0, accepted: 0, rejected: 0, failed: 0 };

  log("info", `Smart filter accepted: ${allJobs.length} total jobs`);

  for (const [index, jobRow] of allJobs.entries()) {
    throwIfCancelled();
    if (index % 25 === 0) await progress({ current: index, total: allJobs.length, processed: summary.processed });
    const filters = jobFilters.instance.getByJobId(jobRow.id);
    const latestFilter = filters[0];
    const hasSmartFilter = filters.some((f) => f.promptVersion === "smart-filter-v1" || String(f.id).startsWith("smart-filter-"));
    if (!latestFilter || latestFilter.verdict !== "accept") { summary.skippedNotAccepted += 1; continue; }
    summary.candidates += 1;
    if (hasSmartFilter && !force) { summary.skippedExistingSmart += 1; continue; }

    const job: JobRecord = {
      id: jobRow.id,
      site: jobRow.ats || "",
      title: jobRow.title,
      company: jobRow.companyName,
      location: jobRow.location,
      url: jobRow.url,
      description: jobRow.description,
    };

    log("info", `Smart filtering job=${job.id} company=${job.company}`);
    try {
      const result = await filterJob(client, job, filterMd, config.targetCompanies);
      if (!result) { summary.failed += 1; continue; }
      jobFilters.instance.save({
        id: `smart-filter-${job.id}-${Date.now()}`,
        jobId: job.id,
        contentHash: jobRow.contentHash,
        verdict: result.filter.verdict,
        score: result.filter.score,
        reasons: result.filter.reasons,
        mustHaveHits: result.filter.must_have_hits,
        missingItems: result.filter.missing,
        model: process.env.OPENCODE_MODEL || process.env.LLM_MODEL || "llm",
        promptVersion: "smart-filter-v1",
      });
      summary.processed += 1;
      if (result.filter.verdict === "accept") summary.accepted += 1;
      else summary.rejected += 1;
      log("info", `Job ${job.id}: ${result.filter.verdict} score=${result.filter.score}`);
    } catch (err: any) {
      summary.failed += 1;
      log("error", `Job ${job.id} failed: ${err.message}`);
    }
  }

  await progress({ current: allJobs.length, total: allJobs.length, processed: summary.processed });
  return summary;
};

import type { HandlerFn } from "../../handler";
import { applicationRuns, applicationRunSteps, jobs } from "../../../db";
import { runApply } from "../../../apply";

export const runApplyHandler: HandlerFn = async (ctx) => {
  const { log, payload, throwIfCancelled } = ctx;
  const applyRunId = String(payload.applyRunId || "");
  const jobId = String(payload.jobId || "");
  const url = String(payload.url || "");
  const profilePath = typeof payload.profilePath === "string" ? payload.profilePath : undefined;

  if (!applyRunId || !jobId || !url) {
    throw new Error("applyRunId, jobId, and url are required");
  }

  const job = jobs.instance.getById(jobId);
  if (!job) throw new Error(`Job not found: ${jobId}`);

  const applyRun = applicationRuns.instance.getById(applyRunId);
  if (!applyRun) throw new Error(`Apply run not found: ${applyRunId}`);

  log("info", `Starting apply automation for ${job.companyName} - ${job.title}`);
  throwIfCancelled();

  try {
    const result = await runApply({
      runId: applyRunId,
      jobId,
      url,
      profilePath,
      runsRepo: applicationRuns.instance,
      stepsRepo: applicationRunSteps.instance,
    });

    throwIfCancelled();
    log("info", `Apply automation finished with status ${result.status}`);
    return result;
  } catch (err: any) {
    applicationRuns.instance.updateStatus(applyRunId, "failed", { error: err.message });
    throw err;
  }
};

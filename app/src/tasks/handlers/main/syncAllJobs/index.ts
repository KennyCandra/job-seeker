import type { HandlerFn } from "../../../handler";
import { companies, taskRuns } from "../../../../db";
import { enqueueTask, cancelTask } from "../../../../queue/enqueue";

export const syncAllJobsHandler: HandlerFn = async (ctx) => {
  const { log, progress, isCancelled, throwIfCancelled } = ctx;
  await throwIfCancelled();

  const allCompanies = await companies.instance.getActive();
  await log("info", `Fan-out sync for ${allCompanies.length} active companies`);

  if (allCompanies.length === 0) {
    await progress({ total: 0, queued: 0, running: 0, completed: 0, failed: 0, cancelled: 0 });
    return { total: 0, queued: 0, running: 0, completed: 0, failed: 0, cancelled: 0, failedSlugs: [] };
  }

  const childEntries: Array<{ runId: string; companySlug: string; companyName: string }> = [];

  for (const company of allCompanies) {
    await throwIfCancelled();
    const { runId } = await enqueueTask("sync-company", { companySlug: company.slug }, {
      dedupeKey: `sync-company:${company.slug}`,
      attempts: 3,
      backoff: { type: "exponential", delay: 30000 },
    });
    childEntries.push({ runId, companySlug: company.slug, companyName: company.name });
    await log("info", `Enqueued sync-company for ${company.name} (${company.slug}) → ${runId}`);
  }

  const total = childEntries.length;
  const failedSlugs: string[] = [];
  let completed = 0;
  let failed = 0;
  let cancelled = 0;
  let running = 0;
  let queued = 0;

  let aggregated = {
    fetched: 0,
    newJobs: 0,
    changedJobs: 0,
    unchangedJobs: 0,
    closedJobs: 0,
  };

  while (true) {
    if (await isCancelled()) {
      await log("warn", "sync-all-jobs cancelled — cancelling children");
      for (const entry of childEntries) {
        try {
          await cancelTask(entry.runId);
        } catch {
          // best-effort
        }
      }
      await log("info", `Cancelled ${childEntries.length} child tasks`);
      break;
    }

    completed = 0; failed = 0; cancelled = 0; running = 0; queued = 0;
    failedSlugs.length = 0;
    aggregated = { fetched: 0, newJobs: 0, changedJobs: 0, unchangedJobs: 0, closedJobs: 0 };

    for (const entry of childEntries) {
      const child = await taskRuns.instance.getById(entry.runId);
      if (!child) continue;
      if (child.status === "completed") {
        completed++;
        if (child.resultJson) {
          try {
            const r = JSON.parse(child.resultJson);
            aggregated.fetched += r.fetched ?? 0;
            aggregated.newJobs += r.newJobs ?? 0;
            aggregated.changedJobs += r.changedJobs ?? 0;
            aggregated.unchangedJobs += r.unchangedJobs ?? 0;
            aggregated.closedJobs += r.closedJobs ?? 0;
          } catch {}
        }
      } else if (child.status === "failed") {
        failed++;
        failedSlugs.push(entry.companySlug);
      } else if (child.status === "cancelled") {
        cancelled++;
      } else if (child.status === "running") {
        running++;
      } else if (child.status === "queued") {
        queued++;
      }
    }

    await progress({ total, queued, running, completed, failed, cancelled, ...aggregated });

    if (completed + failed + cancelled === total) break;

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  return { total, queued, running, completed, failed, cancelled, failedSlugs, ...aggregated };
};

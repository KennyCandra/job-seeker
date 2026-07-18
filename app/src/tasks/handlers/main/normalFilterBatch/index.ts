import type { HandlerFn } from "../../../handler";
import { taskRuns } from "../../../../db";
import { getNormalFilterCandidates } from "../../../../filter";
import { enqueueTask, cancelTask } from "../../../../queue/enqueue";

export const normalFilterBatchHandler: HandlerFn = async (ctx) => {
  const { log, payload, progress, isCancelled, throwIfCancelled } = ctx;
  await throwIfCancelled();

  const { limit, force, companySlug, includeClosed } = payload as Record<string, unknown>;

  const { candidates, skipped } = await getNormalFilterCandidates({
    limit: Number(limit) || 0,
    force: Boolean(force),
    companySlug: companySlug ? String(companySlug) : undefined,
    includeClosed: Boolean(includeClosed),
  });

  await log("info", `Normal filter batch: ${candidates.length} candidates (${skipped} skipped)`);

  if (candidates.length === 0) {
    await progress({ total: 0, queued: 0, running: 0, completed: 0, failed: 0, cancelled: 0, accepted: 0, rejected: 0, skipped });
    return { total: 0, completed: 0, failed: 0, cancelled: 0, accepted: 0, rejected: 0, skipped, failedJobIds: [] };
  }

  const childEntries: Array<{ runId: string; jobId: string; companyName: string }> = [];

  for (const c of candidates) {
    await throwIfCancelled();
    const { runId } = await enqueueTask("normal-filter-job", { jobId: c.jobId, force: Boolean(force), includeClosed: Boolean(includeClosed) }, {
      force: Boolean(force),
      dedupeKey: `normal-filter-job:${c.jobId}:${c.contentHash || "nohash"}`,
      attempts: 2,
      backoff: { type: "exponential", delay: 10000 },
    });
    childEntries.push({ runId, jobId: c.jobId, companyName: c.companyName });
    await log("info", `Enqueued filter for ${c.jobId} (${c.companyName} - ${c.title}) → ${runId}`);
  }

  const total = childEntries.length;
  const failedJobIds: string[] = [];
  let completed = 0;
  let failed = 0;
  let cancelled = 0;
  let running = 0;
  let queued = 0;
  let accepted = 0;
  let rejected = 0;
  let skippedChildren = 0;

  while (true) {
    if (await isCancelled()) {
      await log("warn", "normal-filter-batch cancelled — cancelling children");
      for (const entry of childEntries) {
        try { await cancelTask(entry.runId); } catch {}
      }
      break;
    }

    completed = 0; failed = 0; cancelled = 0; running = 0; queued = 0;
    accepted = 0; rejected = 0; skippedChildren = 0;
    failedJobIds.length = 0;

    for (const entry of childEntries) {
      const child = await taskRuns.instance.getById(entry.runId);
      if (!child) continue;
      if (child.status === "completed") {
        completed++;
        if (child.resultJson) {
          try {
            const r = JSON.parse(child.resultJson);
            if (r.skipped === true) skippedChildren++;
            else if (r.verdict === "accept") accepted++;
            else if (r.verdict === "reject") rejected++;
          } catch {}
        }
      } else if (child.status === "failed") {
        failed++;
        failedJobIds.push(entry.jobId);
      } else if (child.status === "cancelled") {
        cancelled++;
      } else if (child.status === "running") {
        running++;
      } else if (child.status === "queued") {
        queued++;
      }
    }

    await progress({ total, queued, running, completed, failed, cancelled, accepted, rejected, skipped, skippedChildren });

    if (completed + failed + cancelled === total) break;

    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  return { total, completed, failed, cancelled, accepted, rejected, skipped, skippedChildren, failedJobIds };
};

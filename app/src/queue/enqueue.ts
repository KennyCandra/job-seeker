import { Queue } from "bullmq";
import { getQueueConnection, getQueueName } from "./connection";
import type { TaskType, EnqueueOptions } from "./types";
import { taskRuns } from "../db";

function shortId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`.slice(0, 12);
}

const queue = new Queue(getQueueName(), { connection: getQueueConnection() });


export async function enqueueTask(
  type: TaskType,
  payload: Record<string, unknown>,
  opts: EnqueueOptions = {},
): Promise<{ runId: string; bullJobId: string | undefined; status: string }> {
  const dedupeKey = opts.dedupeKey || `${type}:${JSON.stringify(payload)}`;

  if (!opts.force) {
    const existing = await taskRuns.instance.findActiveByDedupeKey(dedupeKey);
    if (existing) {
      const existingJob = existing.bullJobId ? await queue.getJob(existing.bullJobId) : null;
      if (existingJob) {
        return { runId: existing.id, bullJobId: existing.bullJobId || undefined, status: existing.status };
      }
      await taskRuns.instance.updateError(existing.id, "BullMQ job missing from Redis; stale task failed before re-enqueue");
    }
  }

  const runId = `task_${shortId()}`;
  const now = new Date().toISOString();

  await taskRuns.instance.create({
    id: runId,
    bullJobId: null,
    type,
    status: "queued",
    dedupeKey,
    payloadJson: JSON.stringify(payload),
    progressJson: null,
    resultJson: null,
    error: null,
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    completedAt: null,
  });

  const bullOpts: Record<string, unknown> = {
    jobId: opts.jobId || runId,
    removeOnComplete: opts.removeOnComplete ?? { age: 3600 * 24 },
    removeOnFail: opts.removeOnFail ?? { age: 3600 * 24 },
  };
  if (opts.attempts !== undefined) bullOpts.attempts = opts.attempts;
  if (opts.backoff !== undefined) bullOpts.backoff = opts.backoff;

  const job = await queue.add(type, { runId, type, payload, force: !!opts.force }, bullOpts);

  await taskRuns.instance.updateBullJobId(runId, job.id ?? "");

  return { runId, bullJobId: job.id ?? undefined, status: "queued" };
}

export async function cancelTask(runId: string): Promise<boolean> {
  const run = await taskRuns.instance.getById(runId);
  if (!run) return false;
  if (run.status !== "queued" && run.status !== "running") return false;

  await taskRuns.instance.updateStatus(runId, "cancelled");

  if (run.bullJobId) {
    try {
      const job = await queue.getJob(run.bullJobId);
      if (job) await job.remove();
    } catch {
    }
  }

  return true;
}

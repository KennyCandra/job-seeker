import { Injectable, Logger } from "@nestjs/common";
import { Queue } from "bullmq";
import { InjectQueue } from "@nestjs/bullmq";
import { TaskRunsRepository, TaskRunLogsRepository } from "../database/repositories";
import type { TaskType, EnqueueOptions, TaskStatus } from "./types";
import { TASK_QUEUE } from "../queue/constants";

function shortId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`.slice(0, 12);
}

@Injectable()
export class TaskQueueService {
  private readonly logger = new Logger(TaskQueueService.name);

  constructor(
    @InjectQueue(TASK_QUEUE) private readonly queue: Queue,
    private readonly taskRuns: TaskRunsRepository,
    private readonly taskRunLogs: TaskRunLogsRepository,
  ) {}

  async enqueueTask(
    type: TaskType,
    payload: Record<string, unknown>,
    opts: EnqueueOptions = {},
  ): Promise<{ runId: string; bullJobId: string | undefined; status: string }> {
    const dedupeKey = opts.dedupeKey || `${type}:${JSON.stringify(payload)}`;

    if (!opts.force) {
      const existing = await this.taskRuns.findActiveByDedupeKey(dedupeKey);
      if (existing) {
        const existingJob = existing.bullJobId ? await this.queue.getJob(existing.bullJobId) : null;
        if (existingJob) {
          return { runId: existing.id, bullJobId: existing.bullJobId ?? undefined, status: existing.status };
        }
        await this.taskRuns.updateError(existing.id, "BullMQ job missing from Redis; stale task failed before re-enqueue");
      }
    }

    const runId = `task_${shortId()}`;
    const now = new Date().toISOString();
    // The Bull jobId is deterministic, so record it on the row up front and
    // COMMIT before adding the job to Redis. If the job were added first (or in
    // the same DB transaction, which doesn't cover Redis), an idle worker could
    // pick it up and query task_runs before the row is visible — getById would
    // miss, the processor would log "not found" and drop the job, stranding the
    // row as 'queued' forever. Committing first closes that window.
    const bullJobId = opts.jobId || runId;

    await this.taskRuns.create({
      id: runId,
      bullJobId,
      type,
      status: "queued" as TaskStatus,
      dedupeKey,
      payloadJson: JSON.stringify(payload),
      progressJson: null,
      resultJson: null,
      error: null,
      createdAt: now,
      startedAt: null,
      completedAt: null,
      updatedAt: now,
    });

    const bullOpts: Record<string, unknown> = {
      jobId: bullJobId,
      removeOnComplete: opts.removeOnComplete ?? { age: 3600 * 24 },
      removeOnFail: opts.removeOnFail ?? { age: 3600 * 24 },
    };
    if (opts.attempts !== undefined) bullOpts.attempts = opts.attempts;
    if (opts.backoff !== undefined) bullOpts.backoff = opts.backoff;

    // If this add fails (e.g. Redis down), the row is left 'queued' with a
    // bullJobId pointing at a job that doesn't exist. The dedupe path on the
    // next enqueue reconciles that (getJob → null → marked stale/failed).
    await this.queue.add(type, { runId, type, payload, force: !!opts.force }, bullOpts);

    return { runId, bullJobId, status: "queued" };
  }

  async cancelTask(runId: string): Promise<boolean> {
    const run = await this.taskRuns.getById(runId);
    if (!run) return false;
    if (run.status !== "queued" && run.status !== "running") return false;

    await this.taskRuns.updateStatus(runId, "cancelled");

    if (run.bullJobId) {
      try {
        const job = await this.queue.getJob(run.bullJobId);
        if (job) await job.remove();
      } catch {
        // ignore
      }
    }

    return true;
  }
}

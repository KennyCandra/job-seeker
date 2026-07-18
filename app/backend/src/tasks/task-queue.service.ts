import { Injectable, Logger, Inject } from "@nestjs/common";
import { DataSource } from "typeorm";
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
    private readonly dataSource: DataSource,
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
    let bullJobId = "";

    await this.dataSource.transaction(async (manager) => {
      await this.taskRuns.create({
        id: runId,
        bullJobId: null,
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
      }, manager);

      const bullOpts: Record<string, unknown> = {
        jobId: opts.jobId || runId,
        removeOnComplete: opts.removeOnComplete ?? { age: 3600 * 24 },
        removeOnFail: opts.removeOnFail ?? { age: 3600 * 24 },
      };
      if (opts.attempts !== undefined) bullOpts.attempts = opts.attempts;
      if (opts.backoff !== undefined) bullOpts.backoff = opts.backoff;

      const job = await this.queue.add(type, { runId, type, payload, force: !!opts.force }, bullOpts);
      bullJobId = job.id ?? "";
      await this.taskRuns.updateBullJobId(runId, bullJobId, manager);
    });

    return { runId, bullJobId: bullJobId || undefined, status: "queued" };
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

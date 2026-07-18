import { Logger, Injectable } from "@nestjs/common";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import type { Job } from "bullmq";
import { TaskRegistry } from "./task-registry";
import { TaskRunsRepository, TaskRunLogsRepository } from "../database/repositories";
import type { TaskType, TaskHandlerContext, HandlerFn } from "./types";
import { TASK_QUEUE } from "../queue/constants";
import { env } from "../config/env";

interface TaskJobData {
  runId: string;
  type: TaskType;
  payload: Record<string, unknown>;
  force?: boolean;
}

// Lets several sync-company / filter / discovery tasks run at once so a
// fanned-out sync-all-jobs actually processes companies in parallel instead
// of one at a time, while staying capped so we don't hammer ATS APIs.
const TASK_QUEUE_CONCURRENCY = env.WORKER_CONCURRENCY;

@Injectable()
@Processor(TASK_QUEUE, { concurrency: TASK_QUEUE_CONCURRENCY })
export class TaskProcessor extends WorkerHost {
  private readonly logger = new Logger(TaskProcessor.name);

  constructor(
    private readonly registry: TaskRegistry,
    private readonly taskRuns: TaskRunsRepository,
    private readonly taskRunLogs: TaskRunLogsRepository,
  ) {
    super();
  }

  async process(job: Job<TaskJobData>): Promise<void> {
    const { runId, type, payload } = job.data;

    const run = await this.taskRuns.getById(runId);
    if (!run) {
      this.logger.warn(`Task run ${runId} not found`);
      return;
    }
    if (run.status === "completed" || run.status === "failed" || run.status === "cancelled") {
      return;
    }

    await this.taskRuns.updateStatus(runId, "running");

    const handler = this.registry.get(type);
    if (!handler) {
      await this.taskRuns.updateError(runId, `No handler registered for task type "${type}"`);
      return;
    }

    const ctx: TaskHandlerContext = {
      runId,
      payload,
      log: async (level, message) => {
        await this.taskRunLogs.create(runId, level, message);
      },
      progress: async (data) => {
        await this.taskRuns.updateProgress(runId, data);
      },
      isCancelled: async () => {
        const current = await this.taskRuns.getById(runId);
        return current?.status === "cancelled";
      },
      throwIfCancelled: async () => {
        const current = await this.taskRuns.getById(runId);
        if (current?.status === "cancelled") {
          throw new Error("Task cancelled");
        }
      },
    };

    try {
      const result = await (handler as HandlerFn)(ctx, payload);
      const current = await this.taskRuns.getById(runId);
      if (current?.status === "cancelled") {
        return;
      }
      await this.taskRuns.updateResult(runId, result ?? null);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const current = await this.taskRuns.getById(runId);
      if (current?.status === "cancelled") {
        return;
      }
      await this.taskRuns.updateError(runId, message);
    }
  }
}

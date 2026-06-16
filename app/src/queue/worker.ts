import { Worker } from "bullmq";
import { getQueueConnection, getQueueName } from "./connection";
import { taskRuns, taskRunLogs } from "../db";
import { getHandler } from "../tasks/handler";
import type { TaskType, TaskHandlerContext } from "./types";

let worker: Worker | null = null;

export function startWorker(): void {
  if (worker) return;

  worker = new Worker(getQueueName(), async (job) => {
    const { runId, type, payload, force } = job.data as {
      runId: string;
      type: TaskType;
      payload: Record<string, unknown>;
      force?: boolean;
    };

    const log = async (level: string, message: string, meta?: Record<string, unknown>) => {
      await taskRunLogs.instance.create(runId, level, message, meta);
    };

    const progress = async (value: Record<string, unknown>) => {
      await throwIfCancelled();
      await taskRuns.instance.updateProgress(runId, value);
      await job.updateProgress(value);
    };

    const isCancelled = async () => (await taskRuns.instance.getById(runId))?.status === "cancelled";
    const throwIfCancelled = async () => {
      if (await isCancelled()) throw new Error("Task cancelled");
    };

    await taskRuns.instance.updateStatus(runId, "running");
    await log("info", `Starting ${type}`);

    const handler = getHandler(type);
    if (!handler) {
      const err = `No handler registered for task type: ${type}`;
      await log("error", err);
      await taskRuns.instance.updateError(runId, err);
      throw new Error(err);
    }

    try {
      await throwIfCancelled();
      const ctx: TaskHandlerContext = { runId, payload, log, progress, isCancelled, throwIfCancelled };
      const result = await handler(ctx);
      if (await isCancelled()) {
        await log("warn", `Cancelled ${type}`);
        return { cancelled: true };
      }
      await taskRuns.instance.updateResult(runId, result);
      await log("info", `Completed ${type}`);
      return result;
    } catch (err: any) {
      const errMsg = err.message || String(err);
      await log("error", `Failed: ${errMsg}`);
      if (!(await isCancelled())) await taskRuns.instance.updateError(runId, errMsg);
      throw err;
    }
  }, {
    connection: getQueueConnection(),
    concurrency: 1,
    lockDuration: 300000,
  });

  worker.on("failed", (job, err) => {
    console.error(`[worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on("completed", (job) => {
    console.log(`[worker] Job ${job?.id} completed`);
  });

  console.log("[worker] BullMQ worker started");
}

export function stopWorker(): void {
  if (worker) {
    worker.close();
    worker = null;
    console.log("[worker] BullMQ worker stopped");
  }
}

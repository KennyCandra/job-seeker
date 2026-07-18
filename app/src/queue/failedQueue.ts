import { Queue, Worker } from "bullmq";
import { getQueueConnection, HANDLE_FAILED } from "./connection";
import { getHandler } from "../tasks/handler";
import { TaskType } from "./types";
import { AtsPlatform } from "@shared/types";

let worker: Worker | null = null;

export const failedQueue = new Queue(HANDLE_FAILED, {
  connection: getQueueConnection(),
});

export function startFailedQueueWorker(): void {
  if (worker) return;

  worker = new Worker(
    HANDLE_FAILED,
    async (job) => {
      const { type } = job.data as {
        type: TaskType;
        slug: string;
        prevAts : AtsPlatform;
      };

      const handler = getHandler(type);
      if (!handler) throw new Error("detect-migration handler not registered");

      return handler({
        runId: job.id || "",
        payload: job.data,
        log: async () => {},
        progress: async () => {},
        isCancelled: async () => false,
        throwIfCancelled: async () => {},
      });
    },
    {
      connection: getQueueConnection(),
      concurrency: 2,
    },
  );

  worker.on("completed", (job) => {
    console.log(`[migration] Job ${job?.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[migration] Job ${job?.id} failed:`, err.message);
  });

  console.log("[failed queue] Worker started");
}

export function failedQueueWorkerStop(): void {
  if (worker) {
    worker.close();
    worker = null;
  }
}

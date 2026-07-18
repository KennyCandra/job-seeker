import { Queue, Worker } from "bullmq";
import { getQueueConnection, SYNC_QUEUE } from "./connection";
import { getHandler } from "../tasks/handler";
import { TaskType } from "./types";
import { AtsPlatform } from "@shared/types";

let worker: Worker | null = null;

export const SyncQueue = new Queue(SYNC_QUEUE, {
  connection: getQueueConnection(),
});

export function startMigrationWorker(): void {
  if (worker) return;

  worker = new Worker(
    SYNC_QUEUE,
    async (job) => {
      const { type } = job.data as {
        type: TaskType;
        company: {
          name: string;
          id: string;
          slug: string;
          ats: AtsPlatform;
          endpoint: string;
          active: boolean;
          boardUrl: string;
        };
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

  console.log("[migration] Worker started");
}

export function stopMigrationWorker(): void {
  if (worker) {
    worker.close();
    worker = null;
  }
}

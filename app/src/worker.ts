import { registerAllHandlers } from "./tasks/index";
import { startWorker } from "./queue/worker";
import { startMigrationWorker } from "./queue/SyncQueue";
import { startFailedQueueWorker } from "./queue/failedQueue";

registerAllHandlers()
startFailedQueueWorker();
startMigrationWorker();
startWorker();

console.log("[worker] Worker process started");

process.on("SIGINT", () => {
  console.log("\n[worker] Shutting down...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n[worker] Shutting down...");
  process.exit(0);
});

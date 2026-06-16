import { start } from "./server/index";
import { startBot } from "./telegram/index";
import { startPollers } from "./poller/index";
import { registerAllHandlers } from "./tasks/index";
import { startWorker } from "./queue/worker";

registerAllHandlers();

if (process.env.ENABLE_WORKER === "true") {
  startWorker();
}

start();
startBot();
startPollers();

process.on("unhandledRejection", (err) => {
  console.error("[unhandledRejection]", err);
});
process.on("SIGINT", () => {
  console.log("\nShutting down...");
  process.exit(0);
});
process.on("SIGTERM", () => {
  console.log("\nShutting down...");
  process.exit(0);
});

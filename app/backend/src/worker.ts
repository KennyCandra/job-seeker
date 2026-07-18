import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { WorkerModule } from "./worker.module";

async function bootstrap() {
  const logger = new Logger("WorkerBootstrap");
  const app = await NestFactory.createApplicationContext(WorkerModule, { logger: ["log", "warn", "error"] });
  // Fire OnModuleDestroy/OnApplicationShutdown on SIGINT/SIGTERM so BullMQ
  // workers, the DB pool, and Redis pub/sub connections close cleanly.
  app.enableShutdownHooks();
  await app.init();
  logger.log("CV Autopilot worker started — consuming task and apply queues");
}

bootstrap().catch((err) => {
  new Logger("WorkerBootstrap").error(`Failed to start: ${err?.stack ?? err}`);
  process.exit(1);
});

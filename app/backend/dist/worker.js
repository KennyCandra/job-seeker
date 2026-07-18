"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const worker_module_1 = require("./worker.module");
async function bootstrap() {
    const logger = new common_1.Logger("WorkerBootstrap");
    const app = await core_1.NestFactory.createApplicationContext(worker_module_1.WorkerModule, { logger: ["log", "warn", "error"] });
    app.enableShutdownHooks();
    await app.init();
    logger.log("CV Autopilot worker started — consuming task and apply queues");
}
bootstrap().catch((err) => {
    new common_1.Logger("WorkerBootstrap").error(`Failed to start: ${err?.stack ?? err}`);
    process.exit(1);
});
//# sourceMappingURL=worker.js.map
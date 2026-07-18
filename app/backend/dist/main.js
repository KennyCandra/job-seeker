"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const app_module_1 = require("./app.module");
const exception_filter_1 = require("./common/exception.filter");
const validation_pipe_1 = require("./common/validation.pipe");
const schema_guard_1 = require("./database/schema-guard");
const typeorm_1 = require("@nestjs/typeorm");
const env_1 = require("./config/env");
async function bootstrap() {
    const logger = new common_1.Logger("Bootstrap");
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.setGlobalPrefix("api", { exclude: ["health", "admin/{*splat}"] });
    app.useGlobalFilters(new exception_filter_1.GlobalExceptionFilter());
    app.useGlobalPipes(new validation_pipe_1.ZodValidationPipe());
    app.enableCors({ origin: [/^https?:\/\/localhost(:\d+)?$/, /^https?:\/\/127\.0\.0\.1(:\d+)?$/] });
    app.enableShutdownHooks();
    const dataSource = app.get((0, typeorm_1.getDataSourceToken)());
    await (0, schema_guard_1.verifyBaseline)(dataSource);
    await app.listen(env_1.env.PORT, "0.0.0.0");
    logger.log(`CV Autopilot API listening on http://0.0.0.0:${env_1.env.PORT}`);
}
bootstrap().catch((err) => {
    new common_1.Logger("Bootstrap").error(`Failed to start: ${err?.stack ?? err}`);
    process.exit(1);
});
//# sourceMappingURL=main.js.map
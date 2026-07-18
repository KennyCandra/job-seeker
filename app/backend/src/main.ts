import { NestFactory } from "@nestjs/core";
import { Logger } from "@nestjs/common";
import { AppModule } from "./app.module";
import { GlobalExceptionFilter } from "./common/exception.filter";
import { ZodValidationPipe } from "./common/validation.pipe";
import { verifyBaseline } from "./database/schema-guard";
import { getDataSourceToken } from "@nestjs/typeorm";
import { env } from "./config/env";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api", { exclude: ["health", "admin/{*splat}"] });
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalPipes(new ZodValidationPipe());
  // Scope CORS to localhost (any port, for the Vite dev server). When exposed
  // on a LAN IP the frontend is served same-origin by this API, so no cross-
  // origin access is needed there.
  app.enableCors({ origin: [/^https?:\/\/localhost(:\d+)?$/, /^https?:\/\/127\.0\.0\.1(:\d+)?$/] });
  app.enableShutdownHooks();

  const dataSource = app.get(getDataSourceToken());
  await verifyBaseline(dataSource);

  await app.listen(env.PORT, "0.0.0.0");
  logger.log(`CV Autopilot API listening on http://0.0.0.0:${env.PORT}`);
}

bootstrap().catch((err) => {
  new Logger("Bootstrap").error(`Failed to start: ${err?.stack ?? err}`);
  process.exit(1);
});

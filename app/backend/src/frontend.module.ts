import { existsSync } from "fs";
import { Controller, Get } from "@nestjs/common";
import { Module } from "@nestjs/common";
import { ServeStaticModule } from "@nestjs/serve-static";
import { FRONTEND_DIST } from "./common/paths";

const FALLBACK_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>CV Autopilot</title>
  </head>
  <body>
    <div id="root">
      <h1>CV Autopilot backend is running</h1>
      <p>The frontend build was not found at <code>${FRONTEND_DIST}</code>.</p>
      <p>Build it with <code>bun run build:frontend</code> and restart the API.</p>
    </div>
  </body>
</html>`;

@Controller()
export class FrontendFallbackController {
  @Get()
  index(): string {
    return FALLBACK_HTML;
  }
}

const frontendExists = existsSync(FRONTEND_DIST);

@Module({
  imports: frontendExists
    ? [
        ServeStaticModule.forRoot({
          rootPath: FRONTEND_DIST,
          exclude: ["/api/{*splat}", "/health", "/admin/{*splat}"],
          serveStaticOptions: { fallthrough: true },
        }),
      ]
    : [],
  controllers: frontendExists ? [] : [FrontendFallbackController],
})
export class FrontendModule {}

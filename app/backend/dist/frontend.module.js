"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FrontendModule = exports.FrontendFallbackController = void 0;
const fs_1 = require("fs");
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const serve_static_1 = require("@nestjs/serve-static");
const paths_1 = require("./common/paths");
const FALLBACK_HTML = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>CV Autopilot</title>
  </head>
  <body>
    <div id="root">
      <h1>CV Autopilot backend is running</h1>
      <p>The frontend build was not found at <code>${paths_1.FRONTEND_DIST}</code>.</p>
      <p>Build it with <code>bun run build:frontend</code> and restart the API.</p>
    </div>
  </body>
</html>`;
let FrontendFallbackController = class FrontendFallbackController {
    index() {
        return FALLBACK_HTML;
    }
};
exports.FrontendFallbackController = FrontendFallbackController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", String)
], FrontendFallbackController.prototype, "index", null);
exports.FrontendFallbackController = FrontendFallbackController = __decorate([
    (0, common_1.Controller)()
], FrontendFallbackController);
const frontendExists = (0, fs_1.existsSync)(paths_1.FRONTEND_DIST);
let FrontendModule = class FrontendModule {
};
exports.FrontendModule = FrontendModule;
exports.FrontendModule = FrontendModule = __decorate([
    (0, common_2.Module)({
        imports: frontendExists
            ? [
                serve_static_1.ServeStaticModule.forRoot({
                    rootPath: paths_1.FRONTEND_DIST,
                    exclude: ["/api/{*splat}", "/health", "/admin/{*splat}"],
                    serveStaticOptions: { fallthrough: true },
                }),
            ]
            : [],
        controllers: frontendExists ? [] : [FrontendFallbackController],
    })
], FrontendModule);
//# sourceMappingURL=frontend.module.js.map
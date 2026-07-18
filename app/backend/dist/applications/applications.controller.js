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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationsController = void 0;
const common_1 = require("@nestjs/common");
const applications_service_1 = require("./applications.service");
const validation_pipe_1 = require("../common/validation.pipe");
const dto_1 = require("../common/dto");
const errors_1 = require("../common/errors");
const sse_1 = require("../common/sse");
let ApplicationsController = class ApplicationsController {
    apps;
    constructor(apps) {
        this.apps = apps;
    }
    list(cursor) {
        return this.apps.list(cursor);
    }
    updateStatus(jobId, body) {
        return this.apps.updateStatus(jobId, body?.status);
    }
    remove(jobId) {
        return this.apps.remove(jobId);
    }
    async downloadPdf(jobId, res) {
        const { filePath, fileName } = await this.apps.downloadPdf(jobId);
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
        res.sendFile(filePath);
    }
    async generate(jobId, force, res) {
        if (!res)
            throw new errors_1.AppException(500, "Response required");
        const send = (0, sse_1.setupSse)(res);
        try {
            const result = await this.apps.generate(jobId, force === "true");
            send("log", { type: "done", message: "CV generated successfully" });
            send("done", {
                exists: result.exists,
                pdfPath: result.pdfPath,
            });
        }
        catch (err) {
            send("log", { type: "error", message: err?.message ?? String(err) });
            send("done", { error: err?.message ?? String(err) });
        }
        res.end();
    }
};
exports.ApplicationsController = ApplicationsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)("cursor")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ApplicationsController.prototype, "list", null);
__decorate([
    (0, common_1.Patch)(":jobId/status"),
    __param(0, (0, common_1.Param)("jobId")),
    __param(1, (0, common_1.Body)(new validation_pipe_1.ZodValidationPipe(dto_1.updateApplicationStatusSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ApplicationsController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Delete)(":jobId"),
    __param(0, (0, common_1.Param)("jobId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ApplicationsController.prototype, "remove", null);
__decorate([
    (0, common_1.Get)(":jobId/pdf"),
    __param(0, (0, common_1.Param)("jobId")),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ApplicationsController.prototype, "downloadPdf", null);
__decorate([
    (0, common_1.Post)(":jobId/generate"),
    __param(0, (0, common_1.Param)("jobId")),
    __param(1, (0, common_1.Query)("force")),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ApplicationsController.prototype, "generate", null);
exports.ApplicationsController = ApplicationsController = __decorate([
    (0, common_1.Controller)("applications"),
    __metadata("design:paramtypes", [applications_service_1.ApplicationsService])
], ApplicationsController);
//# sourceMappingURL=applications.controller.js.map
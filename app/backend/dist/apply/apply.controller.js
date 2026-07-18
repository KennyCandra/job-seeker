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
exports.ApplyController = void 0;
const common_1 = require("@nestjs/common");
const apply_service_1 = require("./apply.service");
let ApplyController = class ApplyController {
    apply;
    constructor(apply) {
        this.apply = apply;
    }
    startRun(jobId, body) {
        return this.apply.startRun(jobId, body?.profilePath);
    }
    latest(jobId) {
        return this.apply.getLatest(jobId);
    }
    getRun(runId) {
        return this.apply.getRun(runId);
    }
    resume(runId) {
        return this.apply.resume(runId);
    }
    cancel(runId) {
        return this.apply.cancel(runId);
    }
    async screenshots(runId, file, res) {
        const { filePath, contentType } = await this.apply.getScreenshot(runId, file);
        res.setHeader("Content-Type", contentType);
        res.sendFile(filePath);
    }
};
exports.ApplyController = ApplyController;
__decorate([
    (0, common_1.Post)("jobs/:jobId/apply/run"),
    __param(0, (0, common_1.Param)("jobId")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ApplyController.prototype, "startRun", null);
__decorate([
    (0, common_1.Get)("jobs/:jobId/apply/latest"),
    __param(0, (0, common_1.Param)("jobId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ApplyController.prototype, "latest", null);
__decorate([
    (0, common_1.Get)("apply/runs/:runId"),
    __param(0, (0, common_1.Param)("runId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ApplyController.prototype, "getRun", null);
__decorate([
    (0, common_1.Post)("apply/runs/:runId/resume"),
    __param(0, (0, common_1.Param)("runId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ApplyController.prototype, "resume", null);
__decorate([
    (0, common_1.Post)("apply/runs/:runId/cancel"),
    __param(0, (0, common_1.Param)("runId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ApplyController.prototype, "cancel", null);
__decorate([
    (0, common_1.Get)("apply/runs/:runId/screenshots/:file"),
    __param(0, (0, common_1.Param)("runId")),
    __param(1, (0, common_1.Param)("file")),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], ApplyController.prototype, "screenshots", null);
exports.ApplyController = ApplyController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [apply_service_1.ApplyService])
], ApplyController);
//# sourceMappingURL=apply.controller.js.map
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
exports.PipelineController = exports.CvController = exports.JobExtractController = void 0;
const common_1 = require("@nestjs/common");
const documents_1 = require("../shared/documents");
const generator_service_1 = require("../documents/generator.service");
const task_queue_service_1 = require("../tasks/task-queue.service");
const sse_service_1 = require("../tasks/sse.service");
const validation_pipe_1 = require("../common/validation.pipe");
const dto_1 = require("../common/dto");
const sse_1 = require("../common/sse");
let JobExtractController = class JobExtractController {
    async extract(body) {
        return (0, documents_1.extractJobFromText)(body.text);
    }
};
exports.JobExtractController = JobExtractController;
__decorate([
    (0, common_1.Post)("extract"),
    __param(0, (0, common_1.Body)(new validation_pipe_1.ZodValidationPipe(dto_1.extractJobSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], JobExtractController.prototype, "extract", null);
exports.JobExtractController = JobExtractController = __decorate([
    (0, common_1.Controller)("job")
], JobExtractController);
let CvController = class CvController {
    generator;
    constructor(generator) {
        this.generator = generator;
    }
    async generate(body, force, res) {
        if (!res)
            return { error: "Response required" };
        const send = (0, sse_1.setupSse)(res);
        try {
            const result = await this.generator.generate(body.jobId, "cv", force === "true");
            const doc = result.document;
            const pdfPath = doc ? `/api/jobs/${body.jobId}/documents/${doc.id}/download` : null;
            send("log", { type: "done", message: "CV generated successfully" });
            send("done", { pdfPath, jobId: body.jobId });
        }
        catch (err) {
            send("log", { type: "error", message: err?.message ?? String(err) });
            send("done", { error: err?.message ?? String(err) });
        }
        res.end();
    }
};
exports.CvController = CvController;
__decorate([
    (0, common_1.Post)("generate"),
    __param(0, (0, common_1.Body)(new validation_pipe_1.ZodValidationPipe(dto_1.generateCvSchema))),
    __param(1, (0, common_1.Query)("force")),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], CvController.prototype, "generate", null);
exports.CvController = CvController = __decorate([
    (0, common_1.Controller)("cv"),
    __metadata("design:paramtypes", [generator_service_1.GeneratorService])
], CvController);
let PipelineController = class PipelineController {
    queue;
    sse;
    constructor(queue, sse) {
        this.queue = queue;
        this.sse = sse;
    }
    async run(res) {
        const { runId } = await this.queue.enqueueTask("sync-all-jobs", {}, { dedupeKey: "sync-all-jobs" });
        await this.sse.stream(res, runId);
    }
    async discover(res) {
        const { runId } = await this.queue.enqueueTask("discover-companies", {}, { dedupeKey: "discover-companies" });
        await this.sse.stream(res, runId);
    }
    async discoverAndProcess(res) {
        const { runId } = await this.queue.enqueueTask("discover-fetch-filter", {}, { dedupeKey: "discover-fetch-filter" });
        await this.sse.stream(res, runId);
    }
};
exports.PipelineController = PipelineController;
__decorate([
    (0, common_1.Get)("run"),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PipelineController.prototype, "run", null);
__decorate([
    (0, common_1.Get)("discover"),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PipelineController.prototype, "discover", null);
__decorate([
    (0, common_1.Get)("discover-and-process"),
    __param(0, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PipelineController.prototype, "discoverAndProcess", null);
exports.PipelineController = PipelineController = __decorate([
    (0, common_1.Controller)("pipeline"),
    __metadata("design:paramtypes", [task_queue_service_1.TaskQueueService,
        sse_service_1.TasksSseService])
], PipelineController);
//# sourceMappingURL=compat.controller.js.map
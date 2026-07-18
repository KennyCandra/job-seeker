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
var ApplyService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplyService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("bullmq");
const bullmq_2 = require("@nestjs/bullmq");
const fs_1 = require("fs");
const repositories_1 = require("../database/repositories");
const constants_1 = require("../queue/constants");
const errors_1 = require("../common/errors");
const paths_1 = require("../common/paths");
const apply_control_service_1 = require("./apply-control.service");
let ApplyService = ApplyService_1 = class ApplyService {
    queue;
    jobs;
    runs;
    steps;
    control;
    logger = new common_1.Logger(ApplyService_1.name);
    constructor(queue, jobs, runs, steps, control) {
        this.queue = queue;
        this.jobs = jobs;
        this.runs = runs;
        this.steps = steps;
        this.control = control;
    }
    async startRun(jobId, profilePath) {
        const job = await this.jobs.getById(jobId);
        if (!job)
            throw new errors_1.AppException(404, "Job not found");
        if (!job.url)
            throw new errors_1.AppException(400, "Job has no URL to apply at");
        const runId = `apply-${jobId}-${Date.now()}`;
        const resolvedProfile = profilePath || "";
        await this.runs.create({ id: runId, jobId, profilePath: resolvedProfile, currentUrl: job.url });
        await this.steps.create({
            id: `step-${runId}-init`,
            runId,
            type: "info",
            label: "run-started",
            detail: `Starting apply run for ${job.title} at ${job.companyName}`,
        });
        const task = await this.queue.add("run-apply", { applyRunId: runId, jobId, url: job.url, profilePath: resolvedProfile }, { jobId: `run-apply:${runId}`, removeOnComplete: { age: 3600 * 24 }, removeOnFail: { age: 3600 * 24 } });
        return { ok: true, runId, taskRunId: task.id, message: "Apply run queued" };
    }
    async getLatest(jobId) {
        const run = await this.runs.getLatestByJobId(jobId);
        if (!run)
            return { run: null, steps: [] };
        const steps = await this.steps.getByRunId(run.id);
        return { run, steps };
    }
    async getRun(runId) {
        const run = await this.runs.getById(runId);
        if (!run)
            return null;
        const steps = await this.steps.getByRunId(runId);
        return { run, steps };
    }
    async resume(runId) {
        const run = await this.runs.getById(runId);
        if (!run)
            throw new errors_1.AppException(404, "Run not found");
        if (run.status !== "needs_user") {
            throw new errors_1.AppException(400, `Run is not paused for human review (status: ${run.status})`);
        }
        await this.control.publish({ runId, action: "resume" });
        return { ok: true, dispatched: true };
    }
    async cancel(runId) {
        try {
            const job = await this.queue.getJob(`run-apply:${runId}`);
            if (job)
                await job.remove();
        }
        catch {
        }
        await this.control.publish({ runId, action: "cancel" });
        return { ok: true };
    }
    async getScreenshot(runId, fileName) {
        const run = await this.runs.getById(runId);
        if (!run)
            throw new errors_1.AppException(404, "Run not found");
        if (!run.outputDir)
            throw new errors_1.AppException(404, "No output directory for this run");
        const filePath = (0, paths_1.resolveContainedPath)(run.outputDir, fileName);
        if (!filePath)
            throw new errors_1.AppException(403, "Invalid path");
        if (!(0, fs_1.existsSync)(filePath))
            throw new errors_1.AppException(404, "File not found");
        const ext = fileName.toLowerCase().split(".").pop();
        const contentType = ext === "png" ? "image/png" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "application/octet-stream";
        return { filePath, contentType };
    }
};
exports.ApplyService = ApplyService;
exports.ApplyService = ApplyService = ApplyService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bullmq_2.InjectQueue)(constants_1.APPLY_QUEUE)),
    __metadata("design:paramtypes", [bullmq_1.Queue,
        repositories_1.JobsRepository,
        repositories_1.ApplicationRunsRepository,
        repositories_1.ApplicationRunStepsRepository,
        apply_control_service_1.ApplyControlService])
], ApplyService);
//# sourceMappingURL=apply.service.js.map
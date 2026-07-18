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
var JobsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobsService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const repositories_1 = require("../database/repositories");
const ingestion_service_1 = require("./ingestion.service");
const task_queue_service_1 = require("../tasks/task-queue.service");
const llm_1 = require("../shared/llm");
const prompts_1 = require("../shared/prompts");
const errors_1 = require("../common/errors");
let JobsService = JobsService_1 = class JobsService {
    config;
    jobs;
    companies;
    ingestion;
    queue;
    logger = new common_1.Logger(JobsService_1.name);
    client;
    constructor(config, jobs, companies, ingestion, queue) {
        this.config = config;
        this.jobs = jobs;
        this.companies = companies;
        this.ingestion = ingestion;
        this.queue = queue;
        this.client = llm_1.OpenCodeClient.fromConfig(this.config);
    }
    search(input) {
        return this.jobs.search({
            page: Number(input.page) || 1,
            pageSize: Number(input.pageSize) || 50,
            search: String(input.search || ""),
            companyName: String(input.company || ""),
            status: String(input.status || ""),
            verdict: String(input.verdict || ""),
            smartVerdict: String(input.smartVerdict || ""),
            minScore: Number(input.minScore) || 0,
            fetchedWithinHours: Number(input.fetchedWithinHours) || 0,
        });
    }
    getDetail(jobId) {
        return this.jobs.getJobDetail(jobId);
    }
    async manualFromText(text) {
        if (!text || text.trim().length < 20) {
            throw new errors_1.AppException(400, "Pasted job text is too short");
        }
        const prompt = (0, prompts_1.buildExtractPrompt)(text);
        const parsed = await this.client.structured(prompt.system, prompt.user);
        const title = String(parsed?.title || "").trim();
        const companyName = String(parsed?.company || "").trim();
        if (!title) {
            throw new errors_1.AppException(400, "Could not extract a job title from the pasted text");
        }
        const companySlug = companyName ? slugify(companyName) : "manual";
        const result = await this.ingestion.createManualJob({
            companySlug,
            title,
            location: String(parsed?.location || ""),
            url: String(parsed?.url || ""),
            description: String(parsed?.description || ""),
        });
        const detail = await this.getDetail(result.jobId);
        return { job: detail, companySlug: result.companySlug };
    }
    refetch(jobId) {
        return this.queue.enqueueTask("refetch-job", { jobId }, { dedupeKey: `refetch-job:${jobId}` });
    }
    filterCandidates(payload) {
        return this.queue.enqueueTask("normal-filter-batch", {
            limit: Number.isFinite(Number(payload.limit)) ? Number(payload.limit) : 0,
            companySlug: payload.companySlug || undefined,
            includeClosed: Boolean(payload.includeClosed),
            force: Boolean(payload.force),
        }, {
            force: Boolean(payload.force),
            dedupeKey: `normal-filter-batch:${payload.companySlug || "all"}:${Boolean(payload.includeClosed)}:${Number(payload.limit) || 0}`,
        });
    }
    smartFilterAccepted(force) {
        return this.queue.enqueueTask("smart-filter-accepted", { force: Boolean(force) }, { force: Boolean(force), dedupeKey: "smart-filter-accepted" });
    }
    filterJob(jobId) {
        return this.queue.enqueueTask("normal-filter-job", { jobId }, { dedupeKey: `normal-filter-job:${jobId}` });
    }
    smartFilterJob(jobId) {
        return this.queue.enqueueTask("smart-filter-job", { jobId }, { dedupeKey: `smart-filter-job:${jobId}` });
    }
    createApplication(jobId) {
        return this.queue.enqueueTask("create-application", { jobId }, { dedupeKey: `create-application:${jobId}` });
    }
};
exports.JobsService = JobsService;
exports.JobsService = JobsService = JobsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        repositories_1.JobsRepository,
        repositories_1.CompaniesRepository,
        ingestion_service_1.JobsIngestionService,
        task_queue_service_1.TaskQueueService])
], JobsService);
function slugify(name) {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60) || "manual";
}
//# sourceMappingURL=jobs.service.js.map
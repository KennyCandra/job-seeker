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
var ApplicationsTasksService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApplicationsTasksService = exports.SavedJobsService = exports.ApplicationsService = exports.APPLICATION_STATUSES = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const repositories_1 = require("../database/repositories");
const task_registry_1 = require("../tasks/task-registry");
const task_queue_service_1 = require("../tasks/task-queue.service");
const filter_service_1 = require("../filter/filter.service");
const generator_service_1 = require("../documents/generator.service");
const errors_1 = require("../common/errors");
const utils_1 = require("../shared/utils");
const paths_1 = require("../common/paths");
const llm_1 = require("../shared/llm");
const fs_1 = require("fs");
exports.APPLICATION_STATUSES = [
    "approved",
    "ready",
    "applied",
    "interviewing",
    "offer",
    "rejected",
    "ghosted",
    "withdrawn",
];
let ApplicationsService = class ApplicationsService {
    jobs;
    applications;
    jobFilters;
    companies;
    documents;
    generator;
    constructor(jobs, applications, jobFilters, companies, documents, generator) {
        this.jobs = jobs;
        this.applications = applications;
        this.jobFilters = jobFilters;
        this.companies = companies;
        this.documents = documents;
        this.generator = generator;
    }
    async list(cursor) {
        return this.applications.listCursor(cursor);
    }
    async updateStatus(jobId, status) {
        if (!exports.APPLICATION_STATUSES.includes(status)) {
            throw new errors_1.AppException(400, `Invalid status: ${status}`);
        }
        await this.applications.updateStatus(jobId, status);
        return { ok: true };
    }
    async remove(jobId) {
        await this.applications.delete(jobId);
        return { ok: true };
    }
    async downloadPdf(jobId) {
        const appRow = await this.applications.getByJobId(jobId);
        if (!appRow)
            throw new errors_1.AppException(404, "Application not found");
        const cv = (await this.documents.getByJobId(jobId)).find((d) => d.type === "cv" && d.filePath);
        if (!cv)
            throw new errors_1.AppException(404, "No PDF found");
        const filePath = cv.filePath ? (0, paths_1.resolveContainedPath)(paths_1.JOBS_DIR, cv.filePath) : null;
        if (!filePath || !(0, fs_1.existsSync)(filePath))
            throw new errors_1.AppException(404, "PDF file not found");
        return { filePath, fileName: filePath.split(/[\\/]/).pop() || "cv.pdf" };
    }
    async generate(jobId, force = false) {
        const appRow = await this.applications.getByJobId(jobId);
        if (!appRow)
            throw new errors_1.AppException(404, "Application not found");
        const result = await this.generator.generate(jobId, "cv", force);
        const cv = (await this.documents.getByJobId(jobId)).find((d) => d.type === "cv" && d.filePath);
        const pdfPath = cv ? `/api/applications/${jobId}/pdf` : null;
        return { exists: result.exists, pdfPath, document: result.document };
    }
};
exports.ApplicationsService = ApplicationsService;
exports.ApplicationsService = ApplicationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [repositories_1.JobsRepository,
        repositories_1.ApplicationsRepository,
        repositories_1.JobFiltersRepository,
        repositories_1.CompaniesRepository,
        repositories_1.JobDocumentsRepository,
        generator_service_1.GeneratorService])
], ApplicationsService);
let SavedJobsService = class SavedJobsService {
    config;
    jobs;
    applications;
    jobFilters;
    companies;
    filter;
    client;
    constructor(config, jobs, applications, jobFilters, companies, filter) {
        this.config = config;
        this.jobs = jobs;
        this.applications = applications;
        this.jobFilters = jobFilters;
        this.companies = companies;
        this.filter = filter;
        this.client = llm_1.OpenCodeClient.fromConfig(this.config);
    }
    async getSavedJobs(limit) {
        const all = await this.jobs.getAll(this.parseLimit(limit));
        const processedIds = new Set(await this.applications.getProcessedJobIdsFor(all.map((j) => j.id)));
        return all.map((j) => ({ ...j, processed: processedIds.has(j.id) }));
    }
    async getSavedJobsByCompany(company, limit) {
        const list = await this.jobs.getByCompany(company, this.parseLimit(limit));
        const processedIds = new Set(await this.applications.getProcessedJobIdsFor(list.map((j) => j.id)));
        return list.map((j) => ({ ...j, processed: processedIds.has(j.id) }));
    }
    async filterSavedJob(companySlug, jobId) {
        const saved = await this.jobs.get(companySlug, jobId);
        if (!saved)
            throw new errors_1.AppException(404, "Saved job not found");
        const company = await this.companies.getBySlug(companySlug);
        const lite = {
            id: jobId,
            site: saved.ats || "",
            title: saved.title,
            company: company?.name || companySlug,
            location: saved.location,
            url: saved.url,
            description: saved.description,
        };
        const filterMd = (0, utils_1.readText)(`${paths_1.SKILLS_DIR}/job_filter.md`);
        const result = await this.filter.filterJob(lite);
        if (!result)
            return { accepted: false, error: "Filter failed" };
        await this.jobFilters.save({
            id: `filter-${jobId}-${Date.now()}`,
            jobId,
            verdict: result.filter.verdict,
            score: result.filter.score,
            reasons: result.filter.reasons,
            mustHaveHits: result.filter.must_have_hits,
            missingItems: result.filter.missing,
        });
        return {
            accepted: result.filter.verdict === "accept",
            score: result.filter.score,
            reasons: result.filter.reasons,
            mustHaveHits: result.filter.must_have_hits,
            missing: result.filter.missing,
        };
    }
    parseLimit(value) {
        const limit = Number(value);
        return Number.isFinite(limit) ? Math.min(100, Math.max(1, Math.floor(limit))) : 100;
    }
};
exports.SavedJobsService = SavedJobsService;
exports.SavedJobsService = SavedJobsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        repositories_1.JobsRepository,
        repositories_1.ApplicationsRepository,
        repositories_1.JobFiltersRepository,
        repositories_1.CompaniesRepository,
        filter_service_1.FilterService])
], SavedJobsService);
let ApplicationsTasksService = ApplicationsTasksService_1 = class ApplicationsTasksService {
    registry;
    jobs;
    applications;
    jobFilters;
    queue;
    logger = new common_1.Logger(ApplicationsTasksService_1.name);
    constructor(registry, jobs, applications, jobFilters, queue) {
        this.registry = registry;
        this.jobs = jobs;
        this.applications = applications;
        this.jobFilters = jobFilters;
        this.queue = queue;
    }
    onModuleInit() {
        this.registry.register("create-application", this.createApplication.bind(this));
    }
    async createApplication(ctx) {
        const { log, payload, throwIfCancelled } = ctx;
        const jobId = String(payload.jobId || "");
        if (!jobId)
            throw new errors_1.AppException(400, "jobId is required");
        const jobRow = await this.jobs.getById(jobId);
        if (!jobRow)
            throw new errors_1.AppException(404, `Job not found: ${jobId}`);
        const existing = await this.applications.getByJobId(jobId);
        if (existing) {
            await log("info", `Application already exists for job ${jobId}`);
            return { created: false, application: existing };
        }
        await throwIfCancelled();
        const filters = await this.jobFilters.getByJobId(jobId);
        const score = filters.length > 0 ? filters[0].score : 0;
        await this.applications.saveAcceptedJob(jobId, score, "approved");
        const app = await this.applications.getByJobId(jobId);
        await log("info", `Application created for job ${jobId}`);
        return { created: true, application: app };
    }
};
exports.ApplicationsTasksService = ApplicationsTasksService;
exports.ApplicationsTasksService = ApplicationsTasksService = ApplicationsTasksService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [task_registry_1.TaskRegistry,
        repositories_1.JobsRepository,
        repositories_1.ApplicationsRepository,
        repositories_1.JobFiltersRepository,
        task_queue_service_1.TaskQueueService])
], ApplicationsTasksService);
//# sourceMappingURL=applications.service.js.map
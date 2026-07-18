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
exports.JobsTasksService = void 0;
const common_1 = require("@nestjs/common");
const task_registry_1 = require("../tasks/task-registry");
const task_queue_service_1 = require("../tasks/task-queue.service");
const ingestion_service_1 = require("./ingestion.service");
const repositories_1 = require("../database/repositories");
const filter_service_1 = require("../filter/filter.service");
const search_config_service_1 = require("../config/search-config.service");
const errors_1 = require("../common/errors");
let JobsTasksService = class JobsTasksService {
    registry;
    ingestion;
    companies;
    jobs;
    taskQueue;
    filter;
    searchConfig;
    constructor(registry, ingestion, companies, jobs, taskQueue, filter, searchConfig) {
        this.registry = registry;
        this.ingestion = ingestion;
        this.companies = companies;
        this.jobs = jobs;
        this.taskQueue = taskQueue;
        this.filter = filter;
        this.searchConfig = searchConfig;
    }
    onModuleInit() {
        this.registry.register("sync-all-jobs", this.syncAllJobs.bind(this));
        this.registry.register("sync-company", this.syncCompany.bind(this));
        this.registry.register("refetch-job", this.refetchJob.bind(this));
        this.registry.register("detect-migration", this.detectMigration.bind(this));
    }
    async syncAllJobs(ctx) {
        const { payload, log } = ctx;
        const filter = payload?.filter === true;
        const companies = await this.companies.getActive();
        await log("info", `Fanning out sync for ${companies.length} active companies${filter ? " (with post-sync filtering)" : ""}`);
        const enqueued = [];
        for (const company of companies) {
            const { runId } = await this.taskQueue.enqueueTask("sync-company", { companySlug: company.slug, filter }, { dedupeKey: `sync-company:${company.slug}:${filter}` });
            enqueued.push(company.slug);
            await log("info", `Enqueued sync-company for ${company.slug} (run ${runId})`);
        }
        return { enqueued: enqueued.length, companies: enqueued };
    }
    async syncCompany(ctx) {
        const { payload, log, throwIfCancelled } = ctx;
        const companySlug = String(payload.companySlug || "");
        if (!companySlug)
            throw new errors_1.AppException(400, "companySlug is required");
        const company = await this.companies.getBySlug(companySlug);
        if (!company)
            throw new errors_1.AppException(404, `Company not found: ${companySlug}`);
        await log("info", `Syncing company ${companySlug}`);
        try {
            const result = await this.ingestion.syncCompany(company, ctx);
            const summary = { ...result, filtered: 0, accepted: 0 };
            if (payload.filter === true) {
                const candidateIds = [...result.newJobIds, ...result.changedJobIds];
                await log("info", `Running normal filter on ${candidateIds.length} candidates`);
                if (candidateIds.length > 0) {
                    const config = await this.searchConfig.load();
                    let accepted = 0;
                    for (const [index, jobId] of candidateIds.entries()) {
                        await throwIfCancelled();
                        const jobRow = await this.jobs.getById(jobId);
                        if (!jobRow)
                            continue;
                        const lite = this.filter.toLiteJob(jobRow);
                        const filterResult = this.filter.normalFilterJob(lite, config);
                        await this.filter.saveNormalFilterResult(jobId, jobRow.contentHash, filterResult, index);
                        if (filterResult.filter.verdict === "accept")
                            accepted += 1;
                        await log("info", `Job ${jobId}: ${filterResult.filter.verdict} score=${filterResult.filter.score}`);
                    }
                    summary.filtered = candidateIds.length;
                    summary.accepted = accepted;
                }
            }
            return summary;
        }
        catch (err) {
            const message = err?.message ?? String(err);
            if (err?.status === 404) {
                await this.companies.deactivate(companySlug);
                await log("warn", `Company ${companySlug} returned 404 — deactivated, queuing ATS migration check`);
                await this.taskQueue.enqueueTask("detect-migration", { companySlug, prevAts: company.ats }, { dedupeKey: `detect-migration:${companySlug}` });
            }
            else {
                await this.companies.updateFetchError(companySlug, message);
                await log("error", `Sync failed for ${companySlug}: ${message}`);
            }
            throw err;
        }
    }
    async refetchJob(ctx) {
        const { payload, log } = ctx;
        const jobId = String(payload.jobId || "");
        await log("info", `Refetching job ${jobId}`);
        return this.ingestion.refetchJob(jobId, ctx);
    }
    async detectMigration(ctx) {
        const { payload, log } = ctx;
        const companySlug = String(payload.companySlug || "");
        if (!companySlug)
            throw new errors_1.AppException(400, "companySlug is required");
        const prevAts = payload.prevAts || "custom";
        await log("info", `Detecting ATS migration for ${companySlug} (previously ${prevAts})`);
        return this.ingestion.detectMigration(companySlug, prevAts, ctx);
    }
};
exports.JobsTasksService = JobsTasksService;
exports.JobsTasksService = JobsTasksService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [task_registry_1.TaskRegistry,
        ingestion_service_1.JobsIngestionService,
        repositories_1.CompaniesRepository,
        repositories_1.JobsRepository,
        task_queue_service_1.TaskQueueService,
        filter_service_1.FilterService,
        search_config_service_1.SearchConfigService])
], JobsTasksService);
//# sourceMappingURL=jobs.tasks.js.map
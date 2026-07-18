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
var FilterTasksService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilterTasksService = void 0;
const common_1 = require("@nestjs/common");
const task_registry_1 = require("../tasks/task-registry");
const task_queue_service_1 = require("../tasks/task-queue.service");
const task_runs_service_1 = require("../tasks/task-runs.service");
const repositories_1 = require("../database/repositories");
const filter_service_1 = require("./filter.service");
const search_config_service_1 = require("../config/search-config.service");
let FilterTasksService = FilterTasksService_1 = class FilterTasksService {
    registry;
    queue;
    runs;
    jobs;
    filter;
    config;
    jobFiltersRepo;
    logger = new common_1.Logger(FilterTasksService_1.name);
    constructor(registry, queue, runs, jobs, filter, config, jobFiltersRepo) {
        this.registry = registry;
        this.queue = queue;
        this.runs = runs;
        this.jobs = jobs;
        this.filter = filter;
        this.config = config;
        this.jobFiltersRepo = jobFiltersRepo;
    }
    onModuleInit() {
        this.registry.register("normal-filter-batch", this.normalFilterBatch.bind(this));
        this.registry.register("normal-filter-job", this.normalFilterJob.bind(this));
        this.registry.register("smart-filter-accepted", this.smartFilterAccepted.bind(this));
        this.registry.register("smart-filter-job", this.smartFilterJob.bind(this));
    }
    async normalFilterBatch(ctx) {
        const { log, payload, progress, isCancelled, throwIfCancelled } = ctx;
        await throwIfCancelled();
        const { limit, force, companySlug, includeClosed } = payload;
        const { candidates, skipped } = await this.filter.getNormalFilterCandidates({
            limit: Number(limit) || 0,
            force: Boolean(force),
            companySlug: companySlug ? String(companySlug) : undefined,
            includeClosed: Boolean(includeClosed),
        });
        await log("info", `Normal filter batch: ${candidates.length} candidates (${skipped} skipped)`);
        if (candidates.length === 0) {
            await progress({ total: 0, queued: 0, running: 0, completed: 0, failed: 0, cancelled: 0, accepted: 0, rejected: 0, skipped });
            return { total: 0, completed: 0, failed: 0, cancelled: 0, accepted: 0, rejected: 0, skipped, failedJobIds: [] };
        }
        const childEntries = [];
        for (const c of candidates) {
            await throwIfCancelled();
            const { runId } = await this.queue.enqueueTask("normal-filter-job", { jobId: c.jobId, force: Boolean(force), includeClosed: Boolean(includeClosed) }, {
                force: Boolean(force),
                dedupeKey: `normal-filter-job:${c.jobId}:${c.contentHash || "nohash"}`,
                attempts: 2,
                backoff: { type: "exponential", delay: 10000 },
            });
            childEntries.push({ runId, jobId: c.jobId, companyName: c.companyName });
            await log("info", `Enqueued filter for ${c.jobId} (${c.companyName} - ${c.title}) → ${runId}`);
        }
        const total = childEntries.length;
        const failedJobIds = [];
        let completed = 0, failed = 0, cancelled = 0, running = 0, queued = 0, accepted = 0, rejected = 0, skippedChildren = 0;
        while (true) {
            if (await isCancelled()) {
                await log("warn", "normal-filter-batch cancelled — cancelling children");
                for (const entry of childEntries) {
                    try {
                        await this.queue.cancelTask(entry.runId);
                    }
                    catch { }
                }
                break;
            }
            completed = 0;
            failed = 0;
            cancelled = 0;
            running = 0;
            queued = 0;
            accepted = 0;
            rejected = 0;
            skippedChildren = 0;
            failedJobIds.length = 0;
            for (const entry of childEntries) {
                const child = await this.runs.get(entry.runId);
                if (!child)
                    continue;
                if (child.status === "completed") {
                    completed++;
                    if (child.resultJson) {
                        try {
                            const r = JSON.parse(child.resultJson);
                            if (r.skipped === true)
                                skippedChildren++;
                            else if (r.verdict === "accept")
                                accepted++;
                            else if (r.verdict === "reject")
                                rejected++;
                        }
                        catch { }
                    }
                }
                else if (child.status === "failed") {
                    failed++;
                    failedJobIds.push(entry.jobId);
                }
                else if (child.status === "cancelled") {
                    cancelled++;
                }
                else if (child.status === "running") {
                    running++;
                }
                else if (child.status === "queued") {
                    queued++;
                }
            }
            await progress({ total, queued, running, completed, failed, cancelled, accepted, rejected, skipped, skippedChildren });
            if (completed + failed + cancelled === total)
                break;
            await new Promise((resolve) => setTimeout(resolve, 2000));
        }
        return { total, completed, failed, cancelled, accepted, rejected, skipped, skippedChildren, failedJobIds };
    }
    async normalFilterJob(ctx) {
        const { log, payload, throwIfCancelled } = ctx;
        const jobId = String(payload.jobId || "");
        const force = Boolean(payload.force);
        const includeClosed = Boolean(payload.includeClosed);
        if (!jobId)
            throw new Error("jobId is required");
        const jobRow = await this.jobs.getById(jobId);
        if (!jobRow)
            throw new Error(`Job not found: ${jobId}`);
        if (!includeClosed && jobRow.status === "closed") {
            await log("warn", `Job ${jobId} is closed — skipping`);
            return { jobId, skipped: true, reason: "closed" };
        }
        if (!force) {
            const existing = await this.jobFiltersRepo.getByJobId(jobId);
            if (existing.some((f) => f.promptVersion === "normal-filter-scoring-v1" && f.contentHash === jobRow.contentHash)) {
                await log("info", `Job ${jobId} already has the current keyword prefilter — skipping`);
                return { jobId, skipped: true, reason: "already-filtered-current-version" };
            }
        }
        await throwIfCancelled();
        const config = await this.config.load();
        const lite = this.filter.toLiteJob(jobRow);
        const result = this.filter.normalFilterJob(lite, config);
        await this.filter.saveNormalFilterResult(jobId, jobRow.contentHash, result);
        await log("info", `Job ${jobId}: ${result.filter.verdict} score=${result.filter.score}`);
        return { jobId, skipped: false, verdict: result.filter.verdict, score: result.filter.score };
    }
    async smartFilterAccepted(ctx) {
        const { log, payload, throwIfCancelled, progress } = ctx;
        const force = payload.force === true;
        const allJobs = await this.jobs.getAll();
        const config = await this.config.load();
        const filterMd = "";
        void filterMd;
        const summary = { total: allJobs.length, candidates: 0, processed: 0, skippedNotAccepted: 0, skippedExistingSmart: 0, accepted: 0, rejected: 0, failed: 0 };
        await log("info", `Smart filter accepted: ${allJobs.length} total jobs`);
        for (const [index, jobRow] of allJobs.entries()) {
            await throwIfCancelled();
            if (index % 25 === 0)
                await progress({ current: index, total: allJobs.length, processed: summary.processed });
            const filters = await this.jobFiltersRepo.getByJobId(jobRow.id);
            const latestFilter = filters[0];
            const hasSmartFilter = filters.some((f) => f.promptVersion === "smart-filter-v1" || String(f.id).startsWith("smart-filter-"));
            if (!latestFilter || latestFilter.verdict !== "accept") {
                summary.skippedNotAccepted += 1;
                continue;
            }
            summary.candidates += 1;
            if (hasSmartFilter && !force) {
                summary.skippedExistingSmart += 1;
                continue;
            }
            const lite = this.filter.toLiteJob(jobRow);
            await log("info", `Smart filtering job=${jobRow.id} company=${jobRow.companyName}`);
            try {
                const result = await this.filter.filterJob(lite, config.targetCompanies);
                if (!result) {
                    summary.failed += 1;
                    continue;
                }
                await this.filter.saveSmartFilterResult(jobRow.id, jobRow.contentHash, result);
                summary.processed += 1;
                if (result.filter.verdict === "accept")
                    summary.accepted += 1;
                else
                    summary.rejected += 1;
                await log("info", `Job ${jobRow.id}: ${result.filter.verdict} score=${result.filter.score}`);
            }
            catch (err) {
                summary.failed += 1;
                await log("error", `Job ${jobRow.id} failed: ${err?.message ?? err}`);
            }
        }
        await progress({ current: allJobs.length, total: allJobs.length, processed: summary.processed });
        return summary;
    }
    async smartFilterJob(ctx) {
        const { log, payload, throwIfCancelled } = ctx;
        const jobId = String(payload.jobId || "");
        const force = Boolean(payload.force);
        if (!jobId)
            throw new Error("jobId is required");
        const jobRow = await this.jobs.getById(jobId);
        if (!jobRow)
            throw new Error(`Job not found: ${jobId}`);
        if (!force) {
            const existing = await this.jobFiltersRepo.getByJobId(jobId);
            if (existing.some((f) => f.promptVersion === "smart-filter-v1" || String(f.id).startsWith("smart-filter-"))) {
                await log("info", `Job ${jobId} already has a smart filter — skipping`);
                return { jobId, skipped: true, reason: "already-smart-filtered" };
            }
        }
        await throwIfCancelled();
        const config = await this.config.load();
        const lite = this.filter.toLiteJob(jobRow);
        const result = await this.filter.filterJob(lite, config.targetCompanies);
        if (!result)
            throw new Error("Smart filter returned no result");
        await this.filter.saveSmartFilterResult(jobId, jobRow.contentHash, result);
        await log("info", `Smart filter done: ${result.filter.verdict} score=${result.filter.score}`);
        return { jobId, verdict: result.filter.verdict, score: result.filter.score };
    }
};
exports.FilterTasksService = FilterTasksService;
exports.FilterTasksService = FilterTasksService = FilterTasksService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [task_registry_1.TaskRegistry,
        task_queue_service_1.TaskQueueService,
        task_runs_service_1.TaskRunsService,
        repositories_1.JobsRepository,
        filter_service_1.FilterService,
        search_config_service_1.SearchConfigService,
        repositories_1.JobFiltersRepository])
], FilterTasksService);
//# sourceMappingURL=filter.tasks.js.map
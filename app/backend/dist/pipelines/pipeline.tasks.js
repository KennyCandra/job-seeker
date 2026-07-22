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
var PipelineTasksService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PipelineTasksService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const task_registry_1 = require("../tasks/task-registry");
const task_queue_service_1 = require("../tasks/task-queue.service");
const repositories_1 = require("../database/repositories");
const llm_1 = require("../shared/llm");
let PipelineTasksService = PipelineTasksService_1 = class PipelineTasksService {
    registry;
    queue;
    taskRuns;
    companies;
    snapshots;
    config;
    logger = new common_1.Logger(PipelineTasksService_1.name);
    pollMs = 5000;
    constructor(registry, queue, taskRuns, companies, snapshots, config) {
        this.registry = registry;
        this.queue = queue;
        this.taskRuns = taskRuns;
        this.companies = companies;
        this.snapshots = snapshots;
        this.config = config;
    }
    onModuleInit() {
        this.registry.register("daily-pipeline", this.dailyPipeline.bind(this));
    }
    async dailyPipeline(ctx) {
        const { payload, log, progress, isCancelled, throwIfCancelled } = ctx;
        const skipSync = payload.skipSync === true;
        const result = {
            syncRan: false,
            companies: 0,
            syncCompleted: 0,
            syncFailed: 0,
            syncCancelled: 0,
            snapshotDate: new Date().toISOString().slice(0, 10),
            snapshots: 0,
            llmReachable: false,
            smartFilterRan: false,
            smartFilter: null,
        };
        if (!skipSync) {
            const active = await this.companies.getActive();
            result.companies = active.length;
            await log("info", `Daily pipeline: fanning out sync for ${active.length} active companies`);
            const childIds = [];
            for (const company of active) {
                const { runId } = await this.queue.enqueueTask("sync-company", { companySlug: company.slug, filter: true }, { dedupeKey: `sync-company:${company.slug}:true` });
                childIds.push(runId);
            }
            while (true) {
                if (await isCancelled()) {
                    await log("warn", "Daily pipeline cancelled while waiting for syncs — children keep running");
                    throw new Error("Task cancelled");
                }
                const statuses = await this.taskRuns.getStatusesByIds(childIds);
                const byStatus = {};
                for (const s of statuses)
                    byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;
                const completed = byStatus["completed"] ?? 0;
                const failed = byStatus["failed"] ?? 0;
                const cancelled = byStatus["cancelled"] ?? 0;
                const terminal = completed + failed + cancelled;
                await progress({ step: "sync", total: childIds.length, completed, failed, cancelled });
                if (terminal >= childIds.length) {
                    result.syncCompleted = completed;
                    result.syncFailed = failed;
                    result.syncCancelled = cancelled;
                    break;
                }
                await new Promise((r) => setTimeout(r, this.pollMs));
            }
            result.syncRan = true;
            await log("info", `Sync pass done: ${result.syncCompleted} ok, ${result.syncFailed} failed, ${result.syncCancelled} cancelled`);
        }
        else {
            await log("info", "Daily pipeline: skipSync — smart-filter retry pass only");
        }
        await throwIfCancelled();
        if (!skipSync) {
            result.snapshots = await this.snapshots.upsertForDate(result.snapshotDate);
            await log("info", `Snapshotted ${result.snapshots} companies for ${result.snapshotDate}`);
        }
        const llm = llm_1.OpenCodeClient.fromConfig(this.config);
        result.llmReachable = await llm.isReachable();
        if (!result.llmReachable) {
            await log("warn", "OpenCode unreachable — smart filter skipped; hourly catch-up will retry");
            return result;
        }
        await progress({ step: "smart-filter" });
        const { runId } = await this.queue.enqueueTask("smart-filter-accepted", {}, { dedupeKey: "smart-filter-accepted" });
        await log("info", `Enqueued smart-filter-accepted (run ${runId})`);
        while (true) {
            if (await isCancelled()) {
                await log("warn", "Daily pipeline cancelled while waiting for smart filter");
                throw new Error("Task cancelled");
            }
            const run = await this.taskRuns.getById(runId);
            if (!run)
                break;
            if (run.status === "completed") {
                result.smartFilterRan = true;
                try {
                    result.smartFilter = run.resultJson ? JSON.parse(run.resultJson) : null;
                }
                catch {
                    result.smartFilter = null;
                }
                break;
            }
            if (run.status === "failed" || run.status === "cancelled") {
                await log("warn", `smart-filter-accepted ended ${run.status}: ${run.error ?? "no error"}`);
                break;
            }
            await new Promise((r) => setTimeout(r, this.pollMs));
        }
        await log("info", `Daily pipeline done (smartFilterRan=${result.smartFilterRan})`);
        return result;
    }
};
exports.PipelineTasksService = PipelineTasksService;
exports.PipelineTasksService = PipelineTasksService = PipelineTasksService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [task_registry_1.TaskRegistry,
        task_queue_service_1.TaskQueueService,
        repositories_1.TaskRunsRepository,
        repositories_1.CompaniesRepository,
        repositories_1.CompanySnapshotsRepository,
        config_1.ConfigService])
], PipelineTasksService);
//# sourceMappingURL=pipeline.tasks.js.map
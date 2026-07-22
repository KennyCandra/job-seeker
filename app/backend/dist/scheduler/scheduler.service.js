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
var SchedulerService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchedulerService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const schedule_1 = require("@nestjs/schedule");
const cron_1 = require("cron");
const task_queue_service_1 = require("../tasks/task-queue.service");
const repositories_1 = require("../database/repositories");
const catch_up_1 = require("./catch-up");
let SchedulerService = SchedulerService_1 = class SchedulerService {
    registry;
    taskQueue;
    taskRuns;
    config;
    logger = new common_1.Logger(SchedulerService_1.name);
    constructor(registry, taskQueue, taskRuns, config) {
        this.registry = registry;
        this.taskQueue = taskQueue;
        this.taskRuns = taskRuns;
        this.config = config;
    }
    onModuleInit() {
        const syncHours = this.config.get("POLL_INTERVAL_HOURS", { infer: true }) ?? 0;
        if (syncHours > 0) {
            this.logger.log(`Scheduled sync enabled: every ${syncHours}h`);
            this.registry.addInterval("scheduled-sync-all", setInterval(() => void this.tickSync(), syncHours * 3600_000));
            void this.tickSync();
        }
        const discoveryHours = this.config.get("DISCOVERY_INTERVAL_HOURS", { infer: true }) ?? 0;
        if (discoveryHours > 0) {
            this.logger.log(`Scheduled discovery enabled: every ${discoveryHours}h`);
            this.registry.addInterval("scheduled-discovery", setInterval(() => void this.tickDiscovery(), discoveryHours * 3600_000));
            void this.tickDiscovery();
        }
        const pipelineEnabled = this.config.get("DAILY_PIPELINE_ENABLED", { infer: true }) ?? false;
        if (pipelineEnabled) {
            this.logger.log("Daily pipeline enabled: hourly catch-up active");
            this.registry.addInterval("daily-pipeline-catchup", setInterval(() => void this.tickDailyPipeline(), 3600_000));
            void this.tickDailyPipeline();
            const hour = this.config.get("DAILY_PIPELINE_HOUR", { infer: true });
            if (hour != null) {
                this.logger.log(`Daily pipeline cron: daily at ${hour}:00`);
                const job = new cron_1.CronJob(`0 0 ${hour} * * *`, () => void this.enqueueDailyPipeline({}));
                this.registry.addCronJob("daily-pipeline-cron", job);
                job.start();
            }
        }
    }
    async tickSync() {
        try {
            const { runId } = await this.taskQueue.enqueueTask("sync-all-jobs", { filter: true }, { dedupeKey: "scheduled:sync-all" });
            this.logger.log(`Scheduled sync-all-jobs enqueued (run ${runId})`);
        }
        catch (err) {
            this.logger.error(`Failed to enqueue scheduled sync: ${err?.message ?? err}`);
        }
    }
    async tickDiscovery() {
        try {
            const { runId } = await this.taskQueue.enqueueTask("discover-companies", {}, { dedupeKey: "scheduled:discovery" });
            this.logger.log(`Scheduled discover-companies enqueued (run ${runId})`);
        }
        catch (err) {
            this.logger.error(`Failed to enqueue scheduled discovery: ${err?.message ?? err}`);
        }
    }
    async tickDailyPipeline() {
        try {
            const catchupHours = this.config.get("DAILY_PIPELINE_CATCHUP_HOURS", { infer: true }) ?? 20;
            const runs = await this.taskRuns.getRecentCompletedByType("daily-pipeline", 20);
            const action = (0, catch_up_1.decideCatchUp)(runs, new Date(), catchupHours);
            if (action === "none")
                return;
            await this.enqueueDailyPipeline(action === "smart-only" ? { skipSync: true } : {});
        }
        catch (err) {
            this.logger.error(`Daily pipeline catch-up failed: ${err?.message ?? err}`);
        }
    }
    async enqueueDailyPipeline(payload) {
        const { runId } = await this.taskQueue.enqueueTask("daily-pipeline", payload, {
            dedupeKey: "daily-pipeline",
        });
        this.logger.log(`Daily pipeline enqueued (run ${runId}${payload.skipSync ? ", smart-only" : ""})`);
    }
};
exports.SchedulerService = SchedulerService;
exports.SchedulerService = SchedulerService = SchedulerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [schedule_1.SchedulerRegistry,
        task_queue_service_1.TaskQueueService,
        repositories_1.TaskRunsRepository,
        config_1.ConfigService])
], SchedulerService);
//# sourceMappingURL=scheduler.service.js.map
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
const task_queue_service_1 = require("../tasks/task-queue.service");
let SchedulerService = SchedulerService_1 = class SchedulerService {
    registry;
    taskQueue;
    config;
    logger = new common_1.Logger(SchedulerService_1.name);
    constructor(registry, taskQueue, config) {
        this.registry = registry;
        this.taskQueue = taskQueue;
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
};
exports.SchedulerService = SchedulerService;
exports.SchedulerService = SchedulerService = SchedulerService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [schedule_1.SchedulerRegistry,
        task_queue_service_1.TaskQueueService,
        config_1.ConfigService])
], SchedulerService);
//# sourceMappingURL=scheduler.service.js.map
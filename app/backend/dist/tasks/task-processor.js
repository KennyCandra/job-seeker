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
var TaskProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskProcessor = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const task_registry_1 = require("./task-registry");
const repositories_1 = require("../database/repositories");
const constants_1 = require("../queue/constants");
const env_1 = require("../config/env");
const TASK_QUEUE_CONCURRENCY = env_1.env.WORKER_CONCURRENCY;
let TaskProcessor = TaskProcessor_1 = class TaskProcessor extends bullmq_1.WorkerHost {
    registry;
    taskRuns;
    taskRunLogs;
    logger = new common_1.Logger(TaskProcessor_1.name);
    constructor(registry, taskRuns, taskRunLogs) {
        super();
        this.registry = registry;
        this.taskRuns = taskRuns;
        this.taskRunLogs = taskRunLogs;
    }
    async process(job) {
        const { runId, type, payload } = job.data;
        const run = await this.taskRuns.getById(runId);
        if (!run) {
            this.logger.warn(`Task run ${runId} not found`);
            return;
        }
        if (run.status === "completed" || run.status === "failed" || run.status === "cancelled") {
            return;
        }
        await this.taskRuns.updateStatus(runId, "running");
        const handler = this.registry.get(type);
        if (!handler) {
            await this.taskRuns.updateError(runId, `No handler registered for task type "${type}"`);
            return;
        }
        const ctx = {
            runId,
            payload,
            log: async (level, message) => {
                await this.taskRunLogs.create(runId, level, message);
            },
            progress: async (data) => {
                await this.taskRuns.updateProgress(runId, data);
            },
            isCancelled: async () => {
                const current = await this.taskRuns.getById(runId);
                return current?.status === "cancelled";
            },
            throwIfCancelled: async () => {
                const current = await this.taskRuns.getById(runId);
                if (current?.status === "cancelled") {
                    throw new Error("Task cancelled");
                }
            },
        };
        try {
            const result = await handler(ctx, payload);
            const current = await this.taskRuns.getById(runId);
            if (current?.status === "cancelled") {
                return;
            }
            await this.taskRuns.updateResult(runId, result ?? null);
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            const current = await this.taskRuns.getById(runId);
            if (current?.status === "cancelled") {
                return;
            }
            await this.taskRuns.updateError(runId, message);
        }
    }
};
exports.TaskProcessor = TaskProcessor;
exports.TaskProcessor = TaskProcessor = TaskProcessor_1 = __decorate([
    (0, common_1.Injectable)(),
    (0, bullmq_1.Processor)(constants_1.TASK_QUEUE, { concurrency: TASK_QUEUE_CONCURRENCY }),
    __metadata("design:paramtypes", [task_registry_1.TaskRegistry,
        repositories_1.TaskRunsRepository,
        repositories_1.TaskRunLogsRepository])
], TaskProcessor);
//# sourceMappingURL=task-processor.js.map
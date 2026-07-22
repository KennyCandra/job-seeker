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
var TaskQueueService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskQueueService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("bullmq");
const bullmq_2 = require("@nestjs/bullmq");
const repositories_1 = require("../database/repositories");
const constants_1 = require("../queue/constants");
function shortId() {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`.slice(0, 12);
}
let TaskQueueService = TaskQueueService_1 = class TaskQueueService {
    queue;
    taskRuns;
    taskRunLogs;
    logger = new common_1.Logger(TaskQueueService_1.name);
    constructor(queue, taskRuns, taskRunLogs) {
        this.queue = queue;
        this.taskRuns = taskRuns;
        this.taskRunLogs = taskRunLogs;
    }
    async enqueueTask(type, payload, opts = {}) {
        const dedupeKey = opts.dedupeKey || `${type}:${JSON.stringify(payload)}`;
        if (!opts.force) {
            const existing = await this.taskRuns.findActiveByDedupeKey(dedupeKey);
            if (existing) {
                const existingJob = existing.bullJobId ? await this.queue.getJob(existing.bullJobId) : null;
                if (existingJob) {
                    return { runId: existing.id, bullJobId: existing.bullJobId ?? undefined, status: existing.status };
                }
                await this.taskRuns.updateError(existing.id, "BullMQ job missing from Redis; stale task failed before re-enqueue");
            }
        }
        const runId = `task_${shortId()}`;
        const now = new Date().toISOString();
        const bullJobId = opts.jobId || runId;
        await this.taskRuns.create({
            id: runId,
            bullJobId,
            type,
            status: "queued",
            dedupeKey,
            payloadJson: JSON.stringify(payload),
            progressJson: null,
            resultJson: null,
            error: null,
            createdAt: now,
            startedAt: null,
            completedAt: null,
            updatedAt: now,
        });
        const bullOpts = {
            jobId: bullJobId,
            removeOnComplete: opts.removeOnComplete ?? { age: 3600 * 24 },
            removeOnFail: opts.removeOnFail ?? { age: 3600 * 24 },
        };
        if (opts.attempts !== undefined)
            bullOpts.attempts = opts.attempts;
        if (opts.backoff !== undefined)
            bullOpts.backoff = opts.backoff;
        await this.queue.add(type, { runId, type, payload, force: !!opts.force }, bullOpts);
        return { runId, bullJobId, status: "queued" };
    }
    async cancelTask(runId) {
        const run = await this.taskRuns.getById(runId);
        if (!run)
            return false;
        if (run.status !== "queued" && run.status !== "running")
            return false;
        await this.taskRuns.updateStatus(runId, "cancelled");
        if (run.bullJobId) {
            try {
                const job = await this.queue.getJob(run.bullJobId);
                if (job)
                    await job.remove();
            }
            catch {
            }
        }
        return true;
    }
};
exports.TaskQueueService = TaskQueueService;
exports.TaskQueueService = TaskQueueService = TaskQueueService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bullmq_2.InjectQueue)(constants_1.TASK_QUEUE)),
    __metadata("design:paramtypes", [bullmq_1.Queue,
        repositories_1.TaskRunsRepository,
        repositories_1.TaskRunLogsRepository])
], TaskQueueService);
//# sourceMappingURL=task-queue.service.js.map
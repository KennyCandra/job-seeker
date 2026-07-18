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
var TaskReaperService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskReaperService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const repositories_1 = require("../database/repositories");
const constants_1 = require("../queue/constants");
let TaskReaperService = TaskReaperService_1 = class TaskReaperService {
    queue;
    taskRuns;
    logger = new common_1.Logger(TaskReaperService_1.name);
    constructor(queue, taskRuns) {
        this.queue = queue;
        this.taskRuns = taskRuns;
    }
    async onApplicationBootstrap() {
        const running = await this.taskRuns.getByStatus("running");
        let reaped = 0;
        for (const run of running) {
            const job = run.bullJobId ? await this.queue.getJob(run.bullJobId) : null;
            const state = job ? await job.getState() : "missing";
            if (state !== "active" && state !== "waiting" && state !== "delayed") {
                await this.taskRuns.updateError(run.id, "stale run reaped at worker startup — worker previously stopped mid-run");
                reaped++;
            }
        }
        if (reaped > 0)
            this.logger.warn(`Reaped ${reaped} stale running task run(s)`);
    }
};
exports.TaskReaperService = TaskReaperService;
exports.TaskReaperService = TaskReaperService = TaskReaperService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bullmq_1.InjectQueue)(constants_1.TASK_QUEUE)),
    __metadata("design:paramtypes", [bullmq_2.Queue,
        repositories_1.TaskRunsRepository])
], TaskReaperService);
//# sourceMappingURL=task-reaper.service.js.map
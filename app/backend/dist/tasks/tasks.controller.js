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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TasksController = void 0;
const common_1 = require("@nestjs/common");
const task_runs_service_1 = require("./task-runs.service");
const task_queue_service_1 = require("./task-queue.service");
const sse_service_1 = require("./sse.service");
const validation_pipe_1 = require("../common/validation.pipe");
const dto_1 = require("../common/dto");
const types_1 = require("./types");
const errors_1 = require("../common/errors");
let TasksController = class TasksController {
    runs;
    queue;
    sse;
    constructor(runs, queue, sse) {
        this.runs = runs;
        this.queue = queue;
        this.sse = sse;
    }
    async list(query) {
        const [tasks, counts] = await Promise.all([
            this.runs.list(query.limit, query.status),
            this.runs.countByStatuses(),
        ]);
        return { ok: true, tasks, total: counts.total, counts };
    }
    async create(body) {
        if (!types_1.REGISTERED_TASK_TYPES.includes(body.type)) {
            throw new errors_1.AppException(400, `Unknown task type: ${body.type}`);
        }
        return this.queue.enqueueTask(body.type, body.payload ?? {}, { dedupeKey: body.dedupeKey });
    }
    statuses(runIds = []) {
        return this.runs.getStatuses(runIds);
    }
    get(runId) {
        return this.runs.get(runId);
    }
    logs(runId) {
        return this.runs.getLogs(runId);
    }
    async sseStream(res, runId) {
        await this.sse.stream(res, runId);
    }
    async cancel(runId) {
        const ok = await this.queue.cancelTask(runId);
        return { ok };
    }
};
exports.TasksController = TasksController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)(new validation_pipe_1.ZodValidationPipe(dto_1.listTasksQuerySchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TasksController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)(new validation_pipe_1.ZodValidationPipe(dto_1.createTaskSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], TasksController.prototype, "create", null);
__decorate([
    (0, common_1.Get)("status"),
    __param(0, (0, common_1.Query)("runIds", new common_1.ParseArrayPipe({ optional: true }))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "statuses", null);
__decorate([
    (0, common_1.Get)(":runId"),
    __param(0, (0, common_1.Param)("runId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "get", null);
__decorate([
    (0, common_1.Get)(":runId/logs"),
    __param(0, (0, common_1.Param)("runId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], TasksController.prototype, "logs", null);
__decorate([
    (0, common_1.Get)(":runId/events"),
    __param(0, (0, common_1.Res)()),
    __param(1, (0, common_1.Param)("runId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], TasksController.prototype, "sseStream", null);
__decorate([
    (0, common_1.Post)(":runId/cancel"),
    __param(0, (0, common_1.Param)("runId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], TasksController.prototype, "cancel", null);
exports.TasksController = TasksController = __decorate([
    (0, common_1.Controller)("tasks"),
    __metadata("design:paramtypes", [task_runs_service_1.TaskRunsService,
        task_queue_service_1.TaskQueueService,
        sse_service_1.TasksSseService])
], TasksController);
//# sourceMappingURL=tasks.controller.js.map
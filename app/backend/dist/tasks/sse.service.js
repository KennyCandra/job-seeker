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
var TasksSseService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.TasksSseService = void 0;
const common_1 = require("@nestjs/common");
const repositories_1 = require("../database/repositories");
let TasksSseService = TasksSseService_1 = class TasksSseService {
    taskRuns;
    taskRunLogs;
    logger = new common_1.Logger(TasksSseService_1.name);
    constructor(taskRuns, taskRunLogs) {
        this.taskRuns = taskRuns;
        this.taskRunLogs = taskRunLogs;
    }
    async stream(res, runId) {
        res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        });
        const send = (event, data) => {
            res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        };
        const run = await this.taskRuns.getById(runId);
        if (!run) {
            send("error", { message: "Task run not found" });
            res.end();
            return;
        }
        send("status", { status: run.status });
        const logs = await this.taskRunLogs.getByRunId(runId);
        for (const log of logs) {
            send("log", { id: log.id, level: log.level, message: log.message, createdAt: log.createdAt });
        }
        let lastLogCursor = logs.length
            ? { createdAt: logs[logs.length - 1].createdAt, id: logs[logs.length - 1].id }
            : null;
        if (run.resultJson)
            send("result", JSON.parse(run.resultJson));
        if (run.error)
            send("error", { error: run.error });
        if (["completed", "failed", "cancelled"].includes(run.status)) {
            send("done", { status: run.status });
            res.end();
            return;
        }
        const interval = setInterval(() => {
            void (async () => {
                const updatedRun = await this.taskRuns.getById(runId);
                if (!updatedRun) {
                    clearInterval(interval);
                    send("error", { message: "Task run deleted" });
                    send("done", { status: "failed" });
                    res.end();
                    return;
                }
                send("status", { status: updatedRun.status });
                const newLogs = await this.taskRunLogs.getAfter(runId, lastLogCursor);
                for (const log of newLogs) {
                    send("log", { id: log.id, level: log.level, message: log.message, createdAt: log.createdAt });
                    lastLogCursor = { createdAt: log.createdAt, id: log.id };
                }
                if (updatedRun.progressJson) {
                    try {
                        send("progress", JSON.parse(updatedRun.progressJson));
                    }
                    catch {
                    }
                }
                if (updatedRun.resultJson) {
                    try {
                        send("result", JSON.parse(updatedRun.resultJson));
                    }
                    catch {
                    }
                }
                if (["completed", "failed", "cancelled"].includes(updatedRun.status)) {
                    clearInterval(interval);
                    send("done", { status: updatedRun.status });
                    res.end();
                }
            })();
        }, 1000);
        res.on("close", () => {
            clearInterval(interval);
        });
    }
};
exports.TasksSseService = TasksSseService;
exports.TasksSseService = TasksSseService = TasksSseService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [repositories_1.TaskRunsRepository,
        repositories_1.TaskRunLogsRepository])
], TasksSseService);
//# sourceMappingURL=sse.service.js.map
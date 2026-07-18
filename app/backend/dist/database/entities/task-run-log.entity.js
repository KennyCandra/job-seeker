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
exports.TaskRunLog = void 0;
const typeorm_1 = require("typeorm");
let TaskRunLog = class TaskRunLog {
    id;
    runId;
    run;
    level;
    message;
    payloadJson;
    createdAt;
};
exports.TaskRunLog = TaskRunLog;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ type: "text" }),
    __metadata("design:type", String)
], TaskRunLog.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "run_id", type: "text", nullable: false }),
    __metadata("design:type", String)
], TaskRunLog.prototype, "runId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)("TaskRun", (run) => run.logs, {
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
    }),
    (0, typeorm_1.JoinColumn)({ name: "run_id" }),
    __metadata("design:type", Function)
], TaskRunLog.prototype, "run", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: false, default: "info" }),
    __metadata("design:type", String)
], TaskRunLog.prototype, "level", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: false }),
    __metadata("design:type", String)
], TaskRunLog.prototype, "message", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "payload_json", type: "text", nullable: true }),
    __metadata("design:type", Object)
], TaskRunLog.prototype, "payloadJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "created_at", type: "text", nullable: false }),
    __metadata("design:type", String)
], TaskRunLog.prototype, "createdAt", void 0);
exports.TaskRunLog = TaskRunLog = __decorate([
    (0, typeorm_1.Entity)("task_run_logs"),
    (0, typeorm_1.Index)("idx_task_run_logs_run", ["runId"]),
    (0, typeorm_1.Index)("idx_task_run_logs_run_created", ["runId", "createdAt"])
], TaskRunLog);
//# sourceMappingURL=task-run-log.entity.js.map
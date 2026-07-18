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
exports.TaskRun = void 0;
const typeorm_1 = require("typeorm");
let TaskRun = class TaskRun {
    id;
    logs;
    bullJobId;
    type;
    status;
    dedupeKey;
    payloadJson;
    progressJson;
    resultJson;
    error;
    createdAt;
    startedAt;
    completedAt;
    updatedAt;
};
exports.TaskRun = TaskRun;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ type: "text" }),
    __metadata("design:type", String)
], TaskRun.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.OneToMany)("TaskRunLog", (log) => log.run),
    __metadata("design:type", Array)
], TaskRun.prototype, "logs", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "bull_job_id", type: "text", nullable: true }),
    __metadata("design:type", Object)
], TaskRun.prototype, "bullJobId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: false }),
    __metadata("design:type", String)
], TaskRun.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: false, default: "queued" }),
    __metadata("design:type", String)
], TaskRun.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "dedupe_key", type: "text", nullable: true }),
    __metadata("design:type", Object)
], TaskRun.prototype, "dedupeKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "payload_json", type: "text", nullable: false, default: "{}" }),
    __metadata("design:type", String)
], TaskRun.prototype, "payloadJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "progress_json", type: "text", nullable: true }),
    __metadata("design:type", Object)
], TaskRun.prototype, "progressJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "result_json", type: "text", nullable: true }),
    __metadata("design:type", Object)
], TaskRun.prototype, "resultJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", Object)
], TaskRun.prototype, "error", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "created_at", type: "text", nullable: false }),
    __metadata("design:type", String)
], TaskRun.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "started_at", type: "text", nullable: true }),
    __metadata("design:type", Object)
], TaskRun.prototype, "startedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "completed_at", type: "text", nullable: true }),
    __metadata("design:type", Object)
], TaskRun.prototype, "completedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "updated_at", type: "text", nullable: false }),
    __metadata("design:type", String)
], TaskRun.prototype, "updatedAt", void 0);
exports.TaskRun = TaskRun = __decorate([
    (0, typeorm_1.Entity)("task_runs"),
    (0, typeorm_1.Index)("idx_task_runs_status", ["status"]),
    (0, typeorm_1.Index)("idx_task_runs_type", ["type"]),
    (0, typeorm_1.Index)("idx_task_runs_dedupe_key", ["dedupeKey"]),
    (0, typeorm_1.Index)("idx_task_runs_created_at", ["createdAt"]),
    (0, typeorm_1.Index)("idx_task_runs_status_created", ["status", "createdAt"])
], TaskRun);
//# sourceMappingURL=task-run.entity.js.map
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
exports.ApplicationRun = void 0;
const typeorm_1 = require("typeorm");
const application_run_step_entity_1 = require("./application-run-step.entity");
let ApplicationRun = class ApplicationRun {
    id;
    jobId;
    job;
    steps;
    status;
    profilePath;
    outputDir;
    currentUrl;
    error;
    summary;
    createdAt;
    updatedAt;
};
exports.ApplicationRun = ApplicationRun;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ type: "text" }),
    __metadata("design:type", String)
], ApplicationRun.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "job_id", type: "text", nullable: false }),
    __metadata("design:type", String)
], ApplicationRun.prototype, "jobId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)("Job", (job) => job.applicationRuns, {
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
    }),
    (0, typeorm_1.JoinColumn)({ name: "job_id" }),
    __metadata("design:type", Function)
], ApplicationRun.prototype, "job", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => application_run_step_entity_1.ApplicationRunStep, (step) => step.run),
    __metadata("design:type", Array)
], ApplicationRun.prototype, "steps", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: false, default: "running" }),
    __metadata("design:type", String)
], ApplicationRun.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "profile_path", type: "text", nullable: false, default: "" }),
    __metadata("design:type", String)
], ApplicationRun.prototype, "profilePath", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "output_dir", type: "text", nullable: false, default: "" }),
    __metadata("design:type", String)
], ApplicationRun.prototype, "outputDir", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "current_url", type: "text", nullable: false, default: "" }),
    __metadata("design:type", String)
], ApplicationRun.prototype, "currentUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: true }),
    __metadata("design:type", Object)
], ApplicationRun.prototype, "error", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: false, default: "{}" }),
    __metadata("design:type", String)
], ApplicationRun.prototype, "summary", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "created_at", type: "text", nullable: false }),
    __metadata("design:type", String)
], ApplicationRun.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "updated_at", type: "text", nullable: false }),
    __metadata("design:type", String)
], ApplicationRun.prototype, "updatedAt", void 0);
exports.ApplicationRun = ApplicationRun = __decorate([
    (0, typeorm_1.Entity)("application_runs"),
    (0, typeorm_1.Index)("idx_app_runs_job_status", ["jobId", "status"]),
    (0, typeorm_1.Index)("idx_app_runs_job_created", ["jobId", "createdAt"])
], ApplicationRun);
//# sourceMappingURL=application-run.entity.js.map
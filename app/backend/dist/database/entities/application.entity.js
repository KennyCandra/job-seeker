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
exports.Application = void 0;
const typeorm_1 = require("typeorm");
let Application = class Application {
    id;
    jobId;
    job;
    status;
    score;
    documents;
    notes;
    createdAt;
    updatedAt;
};
exports.Application = Application;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ type: "text" }),
    __metadata("design:type", String)
], Application.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "job_id", type: "text", nullable: false, unique: true }),
    __metadata("design:type", String)
], Application.prototype, "jobId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)("Job", (job) => job.applications, {
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
    }),
    (0, typeorm_1.JoinColumn)({ name: "job_id" }),
    __metadata("design:type", Function)
], Application.prototype, "job", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: false, default: "ready" }),
    __metadata("design:type", String)
], Application.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "integer", nullable: false, default: 0 }),
    __metadata("design:type", Number)
], Application.prototype, "score", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: false, default: "[]" }),
    __metadata("design:type", String)
], Application.prototype, "documents", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: false, default: "" }),
    __metadata("design:type", String)
], Application.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "created_at", type: "text", nullable: false }),
    __metadata("design:type", String)
], Application.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "updated_at", type: "text", nullable: false }),
    __metadata("design:type", String)
], Application.prototype, "updatedAt", void 0);
exports.Application = Application = __decorate([
    (0, typeorm_1.Entity)("applications"),
    (0, typeorm_1.Index)("idx_applications_score_created", ["score", "createdAt"]),
    (0, typeorm_1.Index)("idx_applications_created_at", ["createdAt"]),
    (0, typeorm_1.Index)("idx_applications_created_desc_id", ["createdAt", "id"])
], Application);
//# sourceMappingURL=application.entity.js.map
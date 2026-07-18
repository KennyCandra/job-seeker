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
exports.JobFilterEntity = void 0;
const typeorm_1 = require("typeorm");
let JobFilterEntity = class JobFilterEntity {
    id;
    jobId;
    job;
    contentHash;
    verdict;
    score;
    reasons;
    mustHaveHits;
    missingItems;
    model;
    promptVersion;
    createdAt;
};
exports.JobFilterEntity = JobFilterEntity;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ type: "text" }),
    __metadata("design:type", String)
], JobFilterEntity.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", name: "job_id" }),
    __metadata("design:type", String)
], JobFilterEntity.prototype, "jobId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)("Job", (job) => job.filters, {
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
    }),
    (0, typeorm_1.JoinColumn)({ name: "job_id" }),
    __metadata("design:type", Function)
], JobFilterEntity.prototype, "job", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", name: "content_hash", default: "" }),
    __metadata("design:type", String)
], JobFilterEntity.prototype, "contentHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", name: "verdict", default: "reject" }),
    __metadata("design:type", String)
], JobFilterEntity.prototype, "verdict", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "integer", name: "score", default: 0 }),
    __metadata("design:type", Number)
], JobFilterEntity.prototype, "score", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", name: "reasons", default: "[]" }),
    __metadata("design:type", String)
], JobFilterEntity.prototype, "reasons", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", name: "must_have_hits", default: "[]" }),
    __metadata("design:type", String)
], JobFilterEntity.prototype, "mustHaveHits", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", name: "missing_items", default: "[]" }),
    __metadata("design:type", String)
], JobFilterEntity.prototype, "missingItems", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", name: "model", default: "" }),
    __metadata("design:type", String)
], JobFilterEntity.prototype, "model", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", name: "prompt_version", default: "" }),
    __metadata("design:type", String)
], JobFilterEntity.prototype, "promptVersion", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", name: "created_at" }),
    __metadata("design:type", String)
], JobFilterEntity.prototype, "createdAt", void 0);
exports.JobFilterEntity = JobFilterEntity = __decorate([
    (0, typeorm_1.Entity)({ name: "job_filters" })
], JobFilterEntity);
//# sourceMappingURL=job-filter.entity.js.map
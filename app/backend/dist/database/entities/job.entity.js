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
exports.Job = void 0;
const typeorm_1 = require("typeorm");
const company_entity_1 = require("./company.entity");
const job_document_entity_1 = require("./job-document.entity");
const application_entity_1 = require("./application.entity");
const application_run_entity_1 = require("./application-run.entity");
const job_filter_entity_1 = require("./job-filter.entity");
let Job = class Job {
    id;
    companyId;
    company;
    documents;
    applications;
    applicationRuns;
    filters;
    externalId;
    title;
    location;
    url;
    description;
    rawJson;
    contentHash;
    status;
    firstSeenAt;
    lastSeenAt;
    closedAt;
    createdAt;
    updatedAt;
};
exports.Job = Job;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ type: "text" }),
    __metadata("design:type", String)
], Job.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "company_id", type: "integer", nullable: false }),
    __metadata("design:type", Number)
], Job.prototype, "companyId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => company_entity_1.Company, (company) => company.jobs, {
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
    }),
    (0, typeorm_1.JoinColumn)({ name: "company_id" }),
    __metadata("design:type", company_entity_1.Company)
], Job.prototype, "company", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => job_document_entity_1.JobDocument, (doc) => doc.job),
    __metadata("design:type", Array)
], Job.prototype, "documents", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => application_entity_1.Application, (application) => application.job),
    __metadata("design:type", Array)
], Job.prototype, "applications", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => application_run_entity_1.ApplicationRun, (run) => run.job),
    __metadata("design:type", Array)
], Job.prototype, "applicationRuns", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => job_filter_entity_1.JobFilterEntity, (filter) => filter.job),
    __metadata("design:type", Array)
], Job.prototype, "filters", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "external_id", type: "text", nullable: false }),
    __metadata("design:type", String)
], Job.prototype, "externalId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: false, default: "" }),
    __metadata("design:type", String)
], Job.prototype, "title", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: false, default: "" }),
    __metadata("design:type", String)
], Job.prototype, "location", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: false, default: "" }),
    __metadata("design:type", String)
], Job.prototype, "url", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: false, default: "" }),
    __metadata("design:type", String)
], Job.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "raw_json", type: "text", nullable: false, default: "{}" }),
    __metadata("design:type", String)
], Job.prototype, "rawJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "content_hash", type: "text", nullable: false, default: "" }),
    __metadata("design:type", String)
], Job.prototype, "contentHash", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: false, default: "open" }),
    __metadata("design:type", String)
], Job.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "first_seen_at", type: "text", nullable: false }),
    __metadata("design:type", String)
], Job.prototype, "firstSeenAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "last_seen_at", type: "text", nullable: false }),
    __metadata("design:type", String)
], Job.prototype, "lastSeenAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "closed_at", type: "text", nullable: true }),
    __metadata("design:type", Object)
], Job.prototype, "closedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "created_at", type: "text", nullable: false }),
    __metadata("design:type", String)
], Job.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "updated_at", type: "text", nullable: false }),
    __metadata("design:type", String)
], Job.prototype, "updatedAt", void 0);
exports.Job = Job = __decorate([
    (0, typeorm_1.Entity)("jobs"),
    (0, typeorm_1.Index)("idx_jobs_company_external", ["companyId", "externalId"], { unique: true }),
    (0, typeorm_1.Index)("idx_jobs_company", ["companyId"]),
    (0, typeorm_1.Index)("idx_jobs_status", ["status"]),
    (0, typeorm_1.Index)("idx_jobs_updated_at", ["updatedAt"]),
    (0, typeorm_1.Index)("idx_jobs_updated_id", ["updatedAt", "id"]),
    (0, typeorm_1.Index)("idx_jobs_status_updated_at", ["status", "updatedAt"]),
    (0, typeorm_1.Index)("idx_jobs_status_updated_id", ["status", "updatedAt", "id"]),
    (0, typeorm_1.Index)("idx_jobs_company_updated_at", ["companyId", "updatedAt"]),
    (0, typeorm_1.Index)("idx_jobs_company_status_updated", ["companyId", "status", "updatedAt"])
], Job);
//# sourceMappingURL=job.entity.js.map
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
exports.JobDocument = void 0;
const typeorm_1 = require("typeorm");
let JobDocument = class JobDocument {
    id;
    jobId;
    job;
    type;
    status;
    content;
    filePath;
    metadata;
    createdBy;
    createdAt;
    updatedAt;
};
exports.JobDocument = JobDocument;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ type: "text" }),
    __metadata("design:type", String)
], JobDocument.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "job_id", type: "text", nullable: false }),
    __metadata("design:type", String)
], JobDocument.prototype, "jobId", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)("Job", (job) => job.documents, {
        onDelete: "CASCADE",
        onUpdate: "CASCADE",
    }),
    (0, typeorm_1.JoinColumn)({ name: "job_id" }),
    __metadata("design:type", Function)
], JobDocument.prototype, "job", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: false }),
    __metadata("design:type", String)
], JobDocument.prototype, "type", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: false, default: "ready" }),
    __metadata("design:type", String)
], JobDocument.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: false, default: "" }),
    __metadata("design:type", String)
], JobDocument.prototype, "content", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "file_path", type: "text", nullable: false, default: "" }),
    __metadata("design:type", String)
], JobDocument.prototype, "filePath", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: false, default: "{}" }),
    __metadata("design:type", String)
], JobDocument.prototype, "metadata", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "created_by", type: "text", nullable: false, default: "system" }),
    __metadata("design:type", String)
], JobDocument.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "created_at", type: "text", nullable: false }),
    __metadata("design:type", String)
], JobDocument.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "updated_at", type: "text", nullable: false }),
    __metadata("design:type", String)
], JobDocument.prototype, "updatedAt", void 0);
exports.JobDocument = JobDocument = __decorate([
    (0, typeorm_1.Entity)("job_documents"),
    (0, typeorm_1.Index)("idx_job_documents_job_type", ["jobId", "type"])
], JobDocument);
//# sourceMappingURL=job-document.entity.js.map
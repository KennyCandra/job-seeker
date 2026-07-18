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
exports.JobsController = void 0;
const common_1 = require("@nestjs/common");
const zod_1 = require("zod");
const jobs_service_1 = require("./jobs.service");
const validation_pipe_1 = require("../common/validation.pipe");
const dto_1 = require("../common/dto");
const errors_1 = require("../common/errors");
const filterCandidatesSchema = zod_1.z.object({
    limit: zod_1.z.number().optional(),
    force: zod_1.z.boolean().optional(),
    companySlug: zod_1.z.string().optional(),
    includeClosed: zod_1.z.boolean().optional(),
});
const smartFilterAcceptedSchema = zod_1.z.object({ force: zod_1.z.boolean().optional() });
let JobsController = class JobsController {
    jobs;
    constructor(jobs) {
        this.jobs = jobs;
    }
    search(page, pageSize, search, company, status, verdict, smartVerdict, minScore, fetchedWithinHours) {
        return this.jobs.search({
            page, pageSize, search, company, status, verdict, smartVerdict, minScore, fetchedWithinHours,
        });
    }
    filterCandidates(body) {
        return this.jobs.filterCandidates(body).then((r) => ({ ok: true, ...r }));
    }
    smartFilterAccepted(body) {
        return this.jobs.smartFilterAccepted(body?.force).then((r) => ({ ok: true, ...r }));
    }
    async manual(body) {
        const result = await this.jobs.manualFromText(body.text);
        return { ok: true, job: result.job, companySlug: result.companySlug };
    }
    async detail(jobId) {
        const detail = await this.jobs.getDetail(jobId);
        if (!detail) {
            throw new errors_1.AppException(404, "Job not found");
        }
        return detail;
    }
    refetch(jobId) {
        return this.jobs.refetch(jobId).then((r) => ({ ok: true, jobId, ...r }));
    }
    filterJob(jobId) {
        return this.jobs.filterJob(jobId).then((r) => ({ ok: true, jobId, ...r }));
    }
    smartFilterJob(jobId) {
        return this.jobs.smartFilterJob(jobId).then((r) => ({ ok: true, jobId, ...r }));
    }
    createApplication(jobId) {
        return this.jobs.createApplication(jobId).then((r) => ({ ok: true, jobId, ...r }));
    }
};
exports.JobsController = JobsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)("page")),
    __param(1, (0, common_1.Query)("pageSize")),
    __param(2, (0, common_1.Query)("search")),
    __param(3, (0, common_1.Query)("company")),
    __param(4, (0, common_1.Query)("status")),
    __param(5, (0, common_1.Query)("verdict")),
    __param(6, (0, common_1.Query)("smartVerdict")),
    __param(7, (0, common_1.Query)("minScore")),
    __param(8, (0, common_1.Query)("fetchedWithinHours")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], JobsController.prototype, "search", null);
__decorate([
    (0, common_1.Post)("filter-candidates"),
    __param(0, (0, common_1.Body)(new validation_pipe_1.ZodValidationPipe(filterCandidatesSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], JobsController.prototype, "filterCandidates", null);
__decorate([
    (0, common_1.Post)("smart-filter-accepted"),
    __param(0, (0, common_1.Body)(new validation_pipe_1.ZodValidationPipe(smartFilterAcceptedSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], JobsController.prototype, "smartFilterAccepted", null);
__decorate([
    (0, common_1.Post)("manual"),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Body)(new validation_pipe_1.ZodValidationPipe(dto_1.extractJobSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "manual", null);
__decorate([
    (0, common_1.Get)(":jobId"),
    __param(0, (0, common_1.Param)("jobId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], JobsController.prototype, "detail", null);
__decorate([
    (0, common_1.Post)(":jobId/refetch"),
    __param(0, (0, common_1.Param)("jobId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], JobsController.prototype, "refetch", null);
__decorate([
    (0, common_1.Post)(":jobId/filter"),
    __param(0, (0, common_1.Param)("jobId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], JobsController.prototype, "filterJob", null);
__decorate([
    (0, common_1.Post)(":jobId/smart-filter"),
    __param(0, (0, common_1.Param)("jobId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], JobsController.prototype, "smartFilterJob", null);
__decorate([
    (0, common_1.Post)(":jobId/application"),
    __param(0, (0, common_1.Param)("jobId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], JobsController.prototype, "createApplication", null);
exports.JobsController = JobsController = __decorate([
    (0, common_1.Controller)("jobs"),
    __metadata("design:paramtypes", [jobs_service_1.JobsService])
], JobsController);
//# sourceMappingURL=jobs.controller.js.map
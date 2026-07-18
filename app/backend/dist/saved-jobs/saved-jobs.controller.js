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
exports.SavedJobsController = void 0;
const common_1 = require("@nestjs/common");
const applications_service_1 = require("../applications/applications.service");
let SavedJobsController = class SavedJobsController {
    saved;
    constructor(saved) {
        this.saved = saved;
    }
    getSavedJobs(limit) {
        return this.saved.getSavedJobs(limit);
    }
    getSavedJobsByCompany(company, limit) {
        return this.saved.getSavedJobsByCompany(company, limit);
    }
    async filterSavedJob(companySlug, jobId) {
        return this.saved.filterSavedJob(companySlug, jobId);
    }
};
exports.SavedJobsController = SavedJobsController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)("limit")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], SavedJobsController.prototype, "getSavedJobs", null);
__decorate([
    (0, common_1.Get)(":company"),
    __param(0, (0, common_1.Param)("company")),
    __param(1, (0, common_1.Query)("limit")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], SavedJobsController.prototype, "getSavedJobsByCompany", null);
__decorate([
    (0, common_1.Post)(":companySlug/:jobId/filter"),
    __param(0, (0, common_1.Param)("companySlug")),
    __param(1, (0, common_1.Param)("jobId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], SavedJobsController.prototype, "filterSavedJob", null);
exports.SavedJobsController = SavedJobsController = __decorate([
    (0, common_1.Controller)("saved-jobs"),
    __metadata("design:paramtypes", [applications_service_1.SavedJobsService])
], SavedJobsController);
//# sourceMappingURL=saved-jobs.controller.js.map
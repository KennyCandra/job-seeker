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
exports.CompaniesController = void 0;
const common_1 = require("@nestjs/common");
const zod_1 = require("zod");
const companies_service_1 = require("./companies.service");
const validation_pipe_1 = require("../common/validation.pipe");
const dto_1 = require("../common/dto");
const setActiveSchema = zod_1.z.object({ active: zod_1.z.boolean() });
const fetchSchema = zod_1.z.object({ filter: zod_1.z.boolean().optional() });
let CompaniesController = class CompaniesController {
    companies;
    constructor(companies) {
        this.companies = companies;
    }
    getAll() {
        return this.companies.getAll();
    }
    discover() {
        return this.companies.discover().then((r) => ({ ok: true, ...r }));
    }
    discoverLegacy() {
        return this.companies.discoverLegacy().then((r) => ({ ok: true, ...r }));
    }
    create(body) {
        return this.companies.create(body);
    }
    setActive(slug, body) {
        return this.companies.setActive(slug, Boolean(body.active));
    }
    remove(slug) {
        return this.companies.remove(slug);
    }
    fetch(slug, body) {
        return this.companies.fetch(slug, body?.filter).then((r) => ({ ok: true, company: slug, ...r }));
    }
};
exports.CompaniesController = CompaniesController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CompaniesController.prototype, "getAll", null);
__decorate([
    (0, common_1.Post)("discover"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CompaniesController.prototype, "discover", null);
__decorate([
    (0, common_1.Post)("ln"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CompaniesController.prototype, "discoverLegacy", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)(new validation_pipe_1.ZodValidationPipe(dto_1.createCompanySchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CompaniesController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(":slug/active"),
    __param(0, (0, common_1.Param)("slug")),
    __param(1, (0, common_1.Body)(new validation_pipe_1.ZodValidationPipe(setActiveSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CompaniesController.prototype, "setActive", null);
__decorate([
    (0, common_1.Delete)(":slug"),
    __param(0, (0, common_1.Param)("slug")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CompaniesController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)(":slug/fetch"),
    __param(0, (0, common_1.Param)("slug")),
    __param(1, (0, common_1.Body)(new validation_pipe_1.ZodValidationPipe(fetchSchema))),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CompaniesController.prototype, "fetch", null);
exports.CompaniesController = CompaniesController = __decorate([
    (0, common_1.Controller)("companies"),
    __metadata("design:paramtypes", [companies_service_1.CompaniesService])
], CompaniesController);
//# sourceMappingURL=companies.controller.js.map
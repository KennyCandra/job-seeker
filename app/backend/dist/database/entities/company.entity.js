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
exports.Company = void 0;
const typeorm_1 = require("typeorm");
let Company = class Company {
    id;
    jobs;
    name;
    slug;
    ats;
    endpoint;
    active;
    discoveredAt;
    lastFetchedAt;
    lastSuccessfulFetchAt;
    lastErrorAt;
    lastError;
    createdAt;
    updatedAt;
};
exports.Company = Company;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], Company.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.OneToMany)("Job", (job) => job.company),
    __metadata("design:type", Array)
], Company.prototype, "jobs", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: false }),
    __metadata("design:type", String)
], Company.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", unique: true, nullable: false }),
    __metadata("design:type", String)
], Company.prototype, "slug", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: false }),
    __metadata("design:type", String)
], Company.prototype, "ats", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: false }),
    __metadata("design:type", String)
], Company.prototype, "endpoint", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "integer", nullable: false, default: 1 }),
    __metadata("design:type", Number)
], Company.prototype, "active", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "discovered_at", type: "text", nullable: false }),
    __metadata("design:type", String)
], Company.prototype, "discoveredAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "last_fetched_at", type: "text", nullable: true }),
    __metadata("design:type", Object)
], Company.prototype, "lastFetchedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "last_successful_fetch_at", type: "text", nullable: true }),
    __metadata("design:type", Object)
], Company.prototype, "lastSuccessfulFetchAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "last_error_at", type: "text", nullable: true }),
    __metadata("design:type", Object)
], Company.prototype, "lastErrorAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "last_error", type: "text", nullable: true }),
    __metadata("design:type", Object)
], Company.prototype, "lastError", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "created_at", type: "text", nullable: false }),
    __metadata("design:type", String)
], Company.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "updated_at", type: "text", nullable: false }),
    __metadata("design:type", String)
], Company.prototype, "updatedAt", void 0);
exports.Company = Company = __decorate([
    (0, typeorm_1.Entity)("companies"),
    (0, typeorm_1.Index)("idx_companies_active_slug", ["active", "slug"]),
    (0, typeorm_1.Index)("idx_companies_active_ats", ["active", "ats"]),
    (0, typeorm_1.Index)("idx_companies_name", ["name"])
], Company);
//# sourceMappingURL=company.entity.js.map
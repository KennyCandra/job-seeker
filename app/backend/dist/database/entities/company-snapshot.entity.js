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
exports.CompanySnapshot = void 0;
const typeorm_1 = require("typeorm");
let CompanySnapshot = class CompanySnapshot {
    id;
    companyId;
    snapshotDate;
    openCount;
    newCount;
    closedCount;
    createdAt;
};
exports.CompanySnapshot = CompanySnapshot;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)({ type: "bigint" }),
    __metadata("design:type", String)
], CompanySnapshot.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "company_id", type: "integer", nullable: false }),
    __metadata("design:type", Number)
], CompanySnapshot.prototype, "companyId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "snapshot_date", type: "text", nullable: false }),
    __metadata("design:type", String)
], CompanySnapshot.prototype, "snapshotDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "open_count", type: "integer", nullable: false, default: 0 }),
    __metadata("design:type", Number)
], CompanySnapshot.prototype, "openCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "new_count", type: "integer", nullable: false, default: 0 }),
    __metadata("design:type", Number)
], CompanySnapshot.prototype, "newCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "closed_count", type: "integer", nullable: false, default: 0 }),
    __metadata("design:type", Number)
], CompanySnapshot.prototype, "closedCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "created_at", type: "text", nullable: false }),
    __metadata("design:type", String)
], CompanySnapshot.prototype, "createdAt", void 0);
exports.CompanySnapshot = CompanySnapshot = __decorate([
    (0, typeorm_1.Entity)("company_snapshots"),
    (0, typeorm_1.Unique)("uq_company_snapshots_company_date", ["companyId", "snapshotDate"]),
    (0, typeorm_1.Index)("idx_company_snapshots_date", ["snapshotDate"])
], CompanySnapshot);
//# sourceMappingURL=company-snapshot.entity.js.map
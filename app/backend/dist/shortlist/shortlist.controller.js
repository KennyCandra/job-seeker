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
exports.ShortlistController = void 0;
const common_1 = require("@nestjs/common");
const repositories_1 = require("../database/repositories");
let ShortlistController = class ShortlistController {
    shortlist;
    constructor(shortlist) {
        this.shortlist = shortlist;
    }
    getAll() {
        return this.shortlist.getAll();
    }
    delete(jobId) {
        return this.shortlist.delete(jobId).then(() => ({ ok: true }));
    }
};
exports.ShortlistController = ShortlistController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ShortlistController.prototype, "getAll", null);
__decorate([
    (0, common_1.Delete)(":jobId"),
    __param(0, (0, common_1.Param)("jobId")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ShortlistController.prototype, "delete", null);
exports.ShortlistController = ShortlistController = __decorate([
    (0, common_1.Controller)("shortlist"),
    __metadata("design:paramtypes", [repositories_1.ShortlistRepository])
], ShortlistController);
//# sourceMappingURL=shortlist.controller.js.map
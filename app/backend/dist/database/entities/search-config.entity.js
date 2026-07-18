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
exports.SearchConfigEntity = void 0;
const typeorm_1 = require("typeorm");
let SearchConfigEntity = class SearchConfigEntity {
    key;
    value;
};
exports.SearchConfigEntity = SearchConfigEntity;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ type: "text" }),
    __metadata("design:type", String)
], SearchConfigEntity.prototype, "key", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: false }),
    __metadata("design:type", String)
], SearchConfigEntity.prototype, "value", void 0);
exports.SearchConfigEntity = SearchConfigEntity = __decorate([
    (0, typeorm_1.Entity)("search_config")
], SearchConfigEntity);
//# sourceMappingURL=search-config.entity.js.map
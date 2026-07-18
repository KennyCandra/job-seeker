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
exports.UserAnswer = void 0;
const typeorm_1 = require("typeorm");
let UserAnswer = class UserAnswer {
    id;
    category;
    question;
    answer;
    tagsJson;
    createdAt;
    updatedAt;
};
exports.UserAnswer = UserAnswer;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ type: "text" }),
    __metadata("design:type", String)
], UserAnswer.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: false, default: "" }),
    __metadata("design:type", String)
], UserAnswer.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: false, default: "" }),
    __metadata("design:type", String)
], UserAnswer.prototype, "question", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: false, default: "" }),
    __metadata("design:type", String)
], UserAnswer.prototype, "answer", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "tags_json", type: "text", nullable: false, default: "[]" }),
    __metadata("design:type", String)
], UserAnswer.prototype, "tagsJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "created_at", type: "text", nullable: false }),
    __metadata("design:type", String)
], UserAnswer.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "updated_at", type: "text", nullable: false }),
    __metadata("design:type", String)
], UserAnswer.prototype, "updatedAt", void 0);
exports.UserAnswer = UserAnswer = __decorate([
    (0, typeorm_1.Entity)("user_answers"),
    (0, typeorm_1.Index)("idx_user_answers_category_created", ["category", "createdAt"])
], UserAnswer);
//# sourceMappingURL=user-answer.entity.js.map
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
exports.UserProfile = void 0;
const typeorm_1 = require("typeorm");
let UserProfile = class UserProfile {
    id;
    fullName;
    email;
    phone;
    location;
    linkedin;
    portfolio;
    github;
    headline;
    summary;
    skillsJson;
    experienceJson;
    projectsJson;
    educationJson;
    preferencesJson;
    createdAt;
    updatedAt;
};
exports.UserProfile = UserProfile;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ type: "text", default: "default" }),
    __metadata("design:type", String)
], UserProfile.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "full_name", type: "text", nullable: false, default: "" }),
    __metadata("design:type", String)
], UserProfile.prototype, "fullName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: false, default: "" }),
    __metadata("design:type", String)
], UserProfile.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: false, default: "" }),
    __metadata("design:type", String)
], UserProfile.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: false, default: "" }),
    __metadata("design:type", String)
], UserProfile.prototype, "location", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: false, default: "" }),
    __metadata("design:type", String)
], UserProfile.prototype, "linkedin", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: false, default: "" }),
    __metadata("design:type", String)
], UserProfile.prototype, "portfolio", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: false, default: "" }),
    __metadata("design:type", String)
], UserProfile.prototype, "github", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: false, default: "" }),
    __metadata("design:type", String)
], UserProfile.prototype, "headline", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: "text", nullable: false, default: "" }),
    __metadata("design:type", String)
], UserProfile.prototype, "summary", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "skills_json", type: "text", nullable: false, default: "[]" }),
    __metadata("design:type", String)
], UserProfile.prototype, "skillsJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "experience_json", type: "text", nullable: false, default: "[]" }),
    __metadata("design:type", String)
], UserProfile.prototype, "experienceJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "projects_json", type: "text", nullable: false, default: "[]" }),
    __metadata("design:type", String)
], UserProfile.prototype, "projectsJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "education_json", type: "text", nullable: false, default: "[]" }),
    __metadata("design:type", String)
], UserProfile.prototype, "educationJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "preferences_json", type: "text", nullable: false, default: "{}" }),
    __metadata("design:type", String)
], UserProfile.prototype, "preferencesJson", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "created_at", type: "text", nullable: false }),
    __metadata("design:type", String)
], UserProfile.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: "updated_at", type: "text", nullable: false }),
    __metadata("design:type", String)
], UserProfile.prototype, "updatedAt", void 0);
exports.UserProfile = UserProfile = __decorate([
    (0, typeorm_1.Entity)("user_profile")
], UserProfile);
//# sourceMappingURL=user-profile.entity.js.map
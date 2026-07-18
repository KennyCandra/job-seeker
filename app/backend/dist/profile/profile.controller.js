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
exports.ProfileController = void 0;
const common_1 = require("@nestjs/common");
const zod_1 = require("zod");
const profile_service_1 = require("./profile.service");
const errors_1 = require("../common/errors");
const profileSchema = zod_1.z.object({
    fullName: zod_1.z.string().optional(),
    email: zod_1.z.string().email().optional().or(zod_1.z.literal("")),
    phone: zod_1.z.string().optional(),
    location: zod_1.z.string().optional(),
    linkedin: zod_1.z.string().optional(),
    portfolio: zod_1.z.string().optional(),
    github: zod_1.z.string().optional(),
    headline: zod_1.z.string().optional(),
    summary: zod_1.z.string().optional(),
    skillsJson: zod_1.z.string().optional(),
    experienceJson: zod_1.z.string().optional(),
    projectsJson: zod_1.z.string().optional(),
    educationJson: zod_1.z.string().optional(),
    preferencesJson: zod_1.z.string().optional(),
});
let ProfileController = class ProfileController {
    profile;
    constructor(profile) {
        this.profile = profile;
    }
    async get() {
        const profile = await this.profile.getProfile();
        return { ok: true, profile: profile ?? null };
    }
    async put(body) {
        const parsed = profileSchema.parse(body);
        const updated = await this.profile.upsertProfile(parsed);
        return { ok: true, profile: updated };
    }
    async answers() {
        return { ok: true, answers: await this.profile.getAnswers() };
    }
    async createAnswer(body) {
        if (!body.category || !body.question || !body.answer) {
            throw new errors_1.AppException(400, "category, question, and answer required");
        }
        const created = await this.profile.createAnswer(body);
        return { ok: true, answer: created };
    }
    async updateAnswer(id, body) {
        await this.profile.updateAnswer(id, body);
        return { ok: true, answer: await this.profile.getAnswer(id) };
    }
    async deleteAnswer(id) {
        await this.profile.deleteAnswer(id);
        return { ok: true };
    }
};
exports.ProfileController = ProfileController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "get", null);
__decorate([
    (0, common_1.Put)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "put", null);
__decorate([
    (0, common_1.Get)("answers"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "answers", null);
__decorate([
    (0, common_1.Post)("answers"),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "createAnswer", null);
__decorate([
    (0, common_1.Put)("answers/:id"),
    __param(0, (0, common_1.Param)("id")),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "updateAnswer", null);
__decorate([
    (0, common_1.Delete)("answers/:id"),
    __param(0, (0, common_1.Param)("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ProfileController.prototype, "deleteAnswer", null);
exports.ProfileController = ProfileController = __decorate([
    (0, common_1.Controller)("profile"),
    __metadata("design:paramtypes", [profile_service_1.ProfileService])
], ProfileController);
//# sourceMappingURL=profile.controller.js.map
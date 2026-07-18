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
exports.ProfileService = void 0;
const common_1 = require("@nestjs/common");
const repositories_1 = require("../database/repositories");
let ProfileService = class ProfileService {
    profile;
    answers;
    constructor(profile, answers) {
        this.profile = profile;
        this.answers = answers;
    }
    getProfile() {
        return this.profile.get();
    }
    async upsertProfile(data) {
        await this.profile.upsert(data);
        return this.profile.get();
    }
    getAnswers() {
        return this.answers.getAll();
    }
    getAnswer(id) {
        return this.answers.getById(id);
    }
    async createAnswer(input) {
        const id = await this.answers.create(input);
        return this.answers.getById(id);
    }
    updateAnswer(id, data) {
        return this.answers.update(id, data);
    }
    deleteAnswer(id) {
        return this.answers.delete(id);
    }
};
exports.ProfileService = ProfileService;
exports.ProfileService = ProfileService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [repositories_1.UserProfileRepository,
        repositories_1.UserAnswersRepository])
], ProfileService);
//# sourceMappingURL=profile.service.js.map
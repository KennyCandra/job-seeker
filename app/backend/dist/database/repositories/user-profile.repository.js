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
exports.UserProfileRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
let UserProfileRepository = class UserProfileRepository {
    dataSource;
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async get() {
        const rows = await this.dataSource.query(`SELECT id, full_name AS "fullName", email, phone, location, linkedin, portfolio, github, headline, summary,
              skills_json AS "skillsJson", experience_json AS "experienceJson", projects_json AS "projectsJson",
              education_json AS "educationJson", preferences_json AS "preferencesJson",
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM user_profile WHERE id = 'default' LIMIT 1`);
        return rows[0];
    }
    async upsert(data) {
        const now = new Date().toISOString();
        const existing = await this.get();
        const merged = {
            id: "default",
            full_name: data.fullName ?? existing?.fullName ?? "",
            email: data.email ?? existing?.email ?? "",
            phone: data.phone ?? existing?.phone ?? "",
            location: data.location ?? existing?.location ?? "",
            linkedin: data.linkedin ?? existing?.linkedin ?? "",
            portfolio: data.portfolio ?? existing?.portfolio ?? "",
            github: data.github ?? existing?.github ?? "",
            headline: data.headline ?? existing?.headline ?? "",
            summary: data.summary ?? existing?.summary ?? "",
            skills_json: data.skillsJson ?? existing?.skillsJson ?? "[]",
            experience_json: data.experienceJson ?? existing?.experienceJson ?? "[]",
            projects_json: data.projectsJson ?? existing?.projectsJson ?? "[]",
            education_json: data.educationJson ?? existing?.educationJson ?? "[]",
            preferences_json: data.preferencesJson ?? existing?.preferencesJson ?? "{}",
            created_at: existing?.createdAt ?? now,
            updated_at: now,
        };
        const cols = Object.keys(merged);
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
        const updateSets = cols.filter((c) => c !== "id").map((c) => `${c} = EXCLUDED.${c}`).join(", ");
        await this.dataSource.query(`INSERT INTO user_profile (${cols.join(", ")}) VALUES (${placeholders}) ON CONFLICT (id) DO UPDATE SET ${updateSets}`, cols.map((c) => merged[c]));
    }
};
exports.UserProfileRepository = UserProfileRepository;
exports.UserProfileRepository = UserProfileRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], UserProfileRepository);
//# sourceMappingURL=user-profile.repository.js.map
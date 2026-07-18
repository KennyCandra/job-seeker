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
exports.ConfigService = void 0;
const common_1 = require("@nestjs/common");
const repositories_1 = require("../database/repositories");
const DEFAULT = {
    roles: [],
    location: [],
    exclude: [],
    ats: [],
    min_score: 65,
    discovery_interval_hours: 24,
    targetCompanies: [],
};
let ConfigService = class ConfigService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async get() {
        const row = await this.repo.getDefault();
        if (!row)
            return { ...DEFAULT };
        try {
            const parsed = JSON.parse(row.value);
            return {
                roles: parsed.roles ?? [],
                location: parsed.location ?? [],
                exclude: parsed.exclude ?? [],
                ats: parsed.ats ?? [],
                min_score: Number.isFinite(Number(parsed.min_score)) ? Number(parsed.min_score) : 65,
                discovery_interval_hours: Number.isFinite(Number(parsed.discovery_interval_hours)) ? Number(parsed.discovery_interval_hours) : 24,
                targetCompanies: parsed.targetCompanies ?? [],
            };
        }
        catch {
            return { ...DEFAULT };
        }
    }
    async save(config) {
        const value = {
            roles: config.roles ?? [],
            location: config.location ?? [],
            exclude: config.exclude ?? [],
            ats: config.ats ?? [],
            min_score: Number.isFinite(Number(config.min_score)) ? Number(config.min_score) : 65,
            discovery_interval_hours: Number.isFinite(Number(config.discovery_interval_hours)) ? Number(config.discovery_interval_hours) : 24,
            targetCompanies: config.targetCompanies ?? [],
        };
        await this.repo.save("default", JSON.stringify(value));
    }
};
exports.ConfigService = ConfigService;
exports.ConfigService = ConfigService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [repositories_1.SearchConfigRepository])
], ConfigService);
//# sourceMappingURL=config.service.js.map
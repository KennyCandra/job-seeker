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
exports.SearchConfigService = void 0;
const common_1 = require("@nestjs/common");
const repositories_1 = require("../database/repositories");
const DEFAULT_CONFIG = {
    roles: [],
    location: [],
    ats: [],
    exclude: [],
    min_score: 65,
    discovery_interval_hours: 24,
    targetCompanies: [],
};
let SearchConfigService = class SearchConfigService {
    repo;
    constructor(repo) {
        this.repo = repo;
    }
    async load() {
        const row = await this.repo.getDefault();
        if (!row)
            return { ...DEFAULT_CONFIG };
        try {
            const parsed = JSON.parse(row.value);
            return {
                roles: parsed.roles ?? [],
                location: parsed.location ?? [],
                ats: parsed.ats ?? [],
                exclude: parsed.exclude ?? [],
                min_score: Number.isFinite(Number(parsed.min_score)) ? Number(parsed.min_score) : 65,
                discovery_interval_hours: Number.isFinite(Number(parsed.discovery_interval_hours)) ? Number(parsed.discovery_interval_hours) : 24,
                targetCompanies: parsed.targetCompanies ?? [],
            };
        }
        catch {
            return { ...DEFAULT_CONFIG };
        }
    }
};
exports.SearchConfigService = SearchConfigService;
exports.SearchConfigService = SearchConfigService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [repositories_1.SearchConfigRepository])
], SearchConfigService);
//# sourceMappingURL=search-config.service.js.map
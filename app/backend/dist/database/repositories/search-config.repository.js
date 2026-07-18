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
exports.SearchConfigRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
let SearchConfigRepository = class SearchConfigRepository {
    dataSource;
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async getJson(key, fallback) {
        const rows = await this.dataSource.query(`SELECT value FROM search_config WHERE key = $1 LIMIT 1`, [key]);
        if (!rows[0])
            return fallback;
        try {
            return JSON.parse(rows[0].value);
        }
        catch {
            return fallback;
        }
    }
    async setJson(key, value) {
        await this.dataSource.query(`INSERT INTO search_config (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`, [key, JSON.stringify(value)]);
    }
    async getDefault(key = "default") {
        const rows = await this.dataSource.query(`SELECT key, value FROM search_config WHERE key = $1 LIMIT 1`, [key]);
        return rows[0] ? { key: rows[0].key, value: rows[0].value } : undefined;
    }
    async save(key, value) {
        await this.setJson(key, value);
    }
};
exports.SearchConfigRepository = SearchConfigRepository;
exports.SearchConfigRepository = SearchConfigRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], SearchConfigRepository);
//# sourceMappingURL=search-config.repository.js.map
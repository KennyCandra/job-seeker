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
exports.CompaniesRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const paths_1 = require("../../common/paths");
function toCompanyRecord(row) {
    return {
        id: Number(row.id),
        slug: row.slug,
        name: row.name,
        ats: row.ats,
        endpoint: row.endpoint,
        boardUrl: row.endpoint,
        discoveredAt: row.discovered_at,
        lastFetchedAt: row.last_fetched_at ?? null,
        lastSuccessfulFetchAt: row.last_successful_fetch_at ?? null,
        lastErrorAt: row.last_error_at ?? null,
        lastError: row.last_error ?? null,
        active: Boolean(row.active),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
let CompaniesRepository = class CompaniesRepository {
    dataSource;
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async getActive() {
        const rows = await this.dataSource.query(`SELECT id, slug, ats, endpoint, name, active, discovered_at, last_fetched_at, last_successful_fetch_at, last_error_at, last_error, created_at, updated_at FROM companies WHERE active = 1 ORDER BY slug ASC`);
        return rows.map(toCompanyRecord);
    }
    async getBySlug(s) {
        const rows = await this.dataSource.query(`SELECT id, slug, ats, endpoint, name, active, discovered_at, last_fetched_at, last_successful_fetch_at, last_error_at, last_error, created_at, updated_at FROM companies WHERE slug = $1 LIMIT 1`, [s]);
        return rows[0] ? toCompanyRecord(rows[0]) : undefined;
    }
    async getById(id) {
        const rows = await this.dataSource.query(`SELECT id, slug, ats, endpoint, name, active, discovered_at, last_fetched_at, last_successful_fetch_at, last_error_at, last_error, created_at, updated_at FROM companies WHERE id = $1 LIMIT 1`, [id]);
        return rows[0] ? toCompanyRecord(rows[0]) : undefined;
    }
    async getAll() {
        const rows = await this.dataSource.query(`SELECT id, slug, ats, endpoint, name, active, discovered_at, last_fetched_at, last_successful_fetch_at, last_error_at, last_error, created_at, updated_at FROM companies ORDER BY slug ASC`);
        return rows.map(toCompanyRecord);
    }
    async save(input, manager) {
        const s = input.slug ?? (0, paths_1.slug)(input.name);
        const endpoint = input.endpoint ?? input.boardUrl ?? (0, paths_1.endpointForAts)(s, input.ats);
        const now = new Date().toISOString();
        const q = manager ?? this.dataSource;
        try {
            await q.query(`INSERT INTO companies (slug, name, ats, endpoint, discovered_at, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (slug) DO NOTHING`, [s, input.name, input.ats, endpoint, now, now, now]);
            return true;
        }
        catch {
            return false;
        }
    }
    async updateFetchedAt(s, manager) {
        const now = new Date().toISOString();
        const q = manager ?? this.dataSource;
        await q.query(`UPDATE companies SET last_fetched_at = $1, last_successful_fetch_at = $1, last_error = NULL, last_error_at = NULL, updated_at = $1 WHERE slug = $2`, [now, s]);
    }
    async updateFetchError(s, error) {
        const now = new Date().toISOString();
        await this.dataSource.query(`UPDATE companies SET last_fetched_at = $1, last_error = $2, last_error_at = $1, updated_at = $1 WHERE slug = $3`, [now, error, s]);
    }
    async deactivate(s) {
        const now = new Date().toISOString();
        await this.dataSource.query(`UPDATE companies SET active = 0, updated_at = $1 WHERE slug = $2`, [now, s]);
    }
    async reactivate(s) {
        const now = new Date().toISOString();
        await this.dataSource.query(`UPDATE companies SET active = 1, updated_at = $1 WHERE slug = $2`, [now, s]);
    }
    async updateAts(s, ats, endpoint) {
        await this.dataSource.query(`UPDATE companies SET ats = $1, endpoint = $2, updated_at = CURRENT_TIMESTAMP WHERE slug = $3`, [ats, endpoint, s]);
    }
    async countPerAts() {
        const rows = await this.dataSource.query(`SELECT ats, COUNT(*)::int AS count FROM companies WHERE active = 1 GROUP BY ats ORDER BY ats ASC`);
        return rows.map((r) => ({ ats: r.ats, count: Number(r.count) }));
    }
    async seed(companiesList) {
        let count = 0;
        for (const c of companiesList) {
            const endpoint = (0, paths_1.endpointForAts)(c.slug, c.ats);
            const existing = await this.getBySlug(c.slug);
            if (!existing) {
                await this.save({ slug: c.slug, name: c.name, ats: c.ats, endpoint });
                count++;
            }
        }
        return count;
    }
};
exports.CompaniesRepository = CompaniesRepository;
exports.CompaniesRepository = CompaniesRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], CompaniesRepository);
//# sourceMappingURL=companies.repository.js.map
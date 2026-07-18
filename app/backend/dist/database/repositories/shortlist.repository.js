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
exports.ShortlistRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
function parseArray(value) {
    if (!value)
        return [];
    try {
        return JSON.parse(value);
    }
    catch {
        return [];
    }
}
let ShortlistRepository = class ShortlistRepository {
    dataSource;
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async getAll() {
        const rows = await this.dataSource.query(`
      SELECT
        j.id AS "jobId",
        c.name AS "company",
        c.slug AS "companySlug",
        j.title AS "title",
        j.location AS "location",
        lf.score AS "score",
        lf.verdict AS "verdict",
        lf.reasons AS "reasons",
        lf.must_have_hits AS "mustHaveHits",
        lf.missing_items AS "missingItems",
        j.url AS "applyUrl",
        lf.created_at AS "filteredAt"
      FROM (
        SELECT DISTINCT ON (job_id) *
        FROM job_filters
        ORDER BY job_id, created_at DESC, id ASC
      ) lf
      INNER JOIN jobs j ON lf.job_id = j.id
      INNER JOIN companies c ON j.company_id = c.id
      ORDER BY lf.score DESC, lf.created_at DESC
    `);
        return rows.map(toItem);
    }
    async delete(jobId) {
        await this.dataSource.query(`DELETE FROM job_filters WHERE job_id = $1`, [jobId]);
    }
};
exports.ShortlistRepository = ShortlistRepository;
exports.ShortlistRepository = ShortlistRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], ShortlistRepository);
function toItem(r) {
    return {
        jobId: r.jobId,
        company: r.company,
        companySlug: r.companySlug,
        title: r.title,
        location: r.location,
        score: Number(r.score),
        verdict: r.verdict,
        reasons: parseArray(r.reasons),
        mustHaveHits: parseArray(r.mustHaveHits),
        missingItems: parseArray(r.missingItems),
        applyUrl: r.applyUrl,
        filteredAt: r.filteredAt,
    };
}
//# sourceMappingURL=shortlist.repository.js.map
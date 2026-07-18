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
exports.JobFiltersRepository = void 0;
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
let JobFiltersRepository = class JobFiltersRepository {
    dataSource;
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async save(input) {
        const now = input.createdAt || new Date().toISOString();
        await this.dataSource.query(`INSERT INTO job_filters (id, job_id, content_hash, verdict, score, reasons, must_have_hits, missing_items, model, prompt_version, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO UPDATE SET content_hash = EXCLUDED.content_hash, verdict = EXCLUDED.verdict, score = EXCLUDED.score, reasons = EXCLUDED.reasons, must_have_hits = EXCLUDED.must_have_hits, missing_items = EXCLUDED.missing_items, model = EXCLUDED.model, prompt_version = EXCLUDED.prompt_version`, [
            input.id,
            input.jobId,
            input.contentHash ?? "",
            input.verdict ?? "reject",
            input.score ?? 0,
            JSON.stringify(input.reasons ?? []),
            JSON.stringify(input.mustHaveHits ?? []),
            JSON.stringify(input.missingItems ?? []),
            input.model ?? "",
            input.promptVersion ?? "",
            now,
        ]);
    }
    async getByJobId(jobId) {
        const rows = await this.dataSource.query(`SELECT id, job_id, content_hash, verdict, score, reasons, must_have_hits, missing_items, model, prompt_version, created_at FROM job_filters WHERE job_id = $1 ORDER BY created_at DESC, id ASC`, [jobId]);
        return rows.map((r) => ({
            id: r.id,
            jobId: r.job_id,
            contentHash: r.content_hash,
            verdict: r.verdict,
            score: Number(r.score),
            reasons: parseArray(r.reasons),
            mustHaveHits: parseArray(r.must_have_hits),
            missingItems: parseArray(r.missing_items),
            model: r.model,
            promptVersion: r.prompt_version,
            createdAt: r.created_at,
        }));
    }
};
exports.JobFiltersRepository = JobFiltersRepository;
exports.JobFiltersRepository = JobFiltersRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], JobFiltersRepository);
//# sourceMappingURL=job-filters.repository.js.map
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
exports.JobsRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const crypto_1 = require("crypto");
const jobs_list_query_1 = require("../queries/jobs-list.query");
const job_detail_query_1 = require("../queries/job-detail.query");
let JobsRepository = class JobsRepository {
    dataSource;
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async save(input, manager) {
        const now = new Date().toISOString();
        const description = input.description ?? "";
        const rawJson = JSON.stringify(input.rawJson ?? {});
        const contentHash = computeContentHash({
            title: input.title ?? "",
            location: input.location ?? "",
            url: input.url,
            description,
            rawJson,
        });
        const q = manager ?? this.dataSource;
        await q.query(`INSERT INTO jobs (id, company_id, external_id, url, title, location, description, raw_json, content_hash, status, first_seen_at, last_seen_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11, $11, $11)
       ON CONFLICT (company_id, external_id) DO UPDATE SET
         url = EXCLUDED.url, title = EXCLUDED.title, location = EXCLUDED.location, description = EXCLUDED.description,
         raw_json = EXCLUDED.raw_json, content_hash = EXCLUDED.content_hash, status = EXCLUDED.status,
         last_seen_at = EXCLUDED.last_seen_at, closed_at = NULL, updated_at = EXCLUDED.updated_at`, [
            input.id,
            input.companyId,
            input.externalId,
            input.url,
            input.title ?? "",
            input.location ?? "",
            description,
            rawJson,
            contentHash,
            input.status ?? "open",
            now,
        ]);
    }
    async getById(id) {
        const rows = await this.dataSource.query(`SELECT j.id, j.company_id, j.external_id, j.title, j.location, j.url, j.description, j.raw_json, j.content_hash, j.status, j.first_seen_at, j.last_seen_at, j.closed_at, j.created_at, j.updated_at, c.slug AS company_slug, c.name AS company_name, c.ats
       FROM jobs j INNER JOIN companies c ON c.id = j.company_id WHERE j.id = $1 LIMIT 1`, [id]);
        const row = rows[0];
        if (!row)
            return undefined;
        return {
            ...toJobRow(row),
            companySlug: row.company_slug,
            companyName: row.company_name,
            ats: row.ats,
        };
    }
    async get(companySlug, externalOrJobId) {
        const company = await this.dataSource.query(`SELECT id, slug, name, ats FROM companies WHERE slug = $1 LIMIT 1`, [companySlug]);
        if (!company[0])
            return undefined;
        const byExternal = await this.dataSource.query(`SELECT j.* FROM jobs j WHERE j.company_id = $1 AND j.external_id = $2 LIMIT 1`, [company[0].id, externalOrJobId]);
        const row = byExternal[0] || (await this.dataSource.query(`SELECT j.* FROM jobs j WHERE j.company_id = $1 AND j.id = $2 LIMIT 1`, [company[0].id, externalOrJobId]))[0];
        return row ? toSavedJob(row, company[0]) : undefined;
    }
    async getAll(limit = 100) {
        const sql = `SELECT j.id, j.company_id, j.external_id, j.title, j.location, j.url, j.description, j.raw_json, j.content_hash, j.status, j.first_seen_at, j.last_seen_at, j.closed_at, j.created_at, j.updated_at, c.slug AS company_slug, c.name AS company_name, c.ats
      FROM jobs j INNER JOIN companies c ON c.id = j.company_id ORDER BY j.updated_at DESC${limit === null ? "" : " LIMIT " + Math.floor(limit)}`;
        const rows = await this.dataSource.query(sql);
        return rows.map((r) => toSavedJob(r, { slug: r.company_slug, name: r.company_name, ats: r.ats }));
    }
    async search(input = {}) {
        return (0, jobs_list_query_1.searchJobsList)(this.dataSource, input);
    }
    async getByCompany(companySlug, limit = 100) {
        const company = await this.dataSource.query(`SELECT id, slug, name, ats FROM companies WHERE slug = $1 LIMIT 1`, [companySlug]);
        if (!company[0])
            return [];
        const sql = `SELECT j.id, j.company_id, j.external_id, j.title, j.location, j.url, j.description, j.raw_json, j.content_hash, j.status, j.first_seen_at, j.last_seen_at, j.closed_at, j.created_at, j.updated_at, c.slug AS company_slug, c.name AS company_name, c.ats
      FROM jobs j INNER JOIN companies c ON c.id = j.company_id WHERE j.company_id = $1 ORDER BY j.updated_at DESC${limit === null ? "" : " LIMIT " + Math.floor(limit)}`;
        const rows = await this.dataSource.query(sql, [company[0].id]);
        return rows.map((r) => toSavedJob(r, company[0]));
    }
    async delete(companySlug, externalOrJobId) {
        const company = await this.dataSource.query(`SELECT id FROM companies WHERE slug = $1 LIMIT 1`, [companySlug]);
        if (!company[0])
            return;
        await this.dataSource.query(`DELETE FROM jobs WHERE company_id = $1 AND external_id = $2`, [company[0].id, externalOrJobId]);
    }
    async count() {
        const rows = await this.dataSource.query(`SELECT COUNT(*)::int AS c FROM jobs`);
        return Number(rows[0]?.c ?? 0);
    }
    async countByCompany(companySlug) {
        const company = await this.dataSource.query(`SELECT id FROM companies WHERE slug = $1 LIMIT 1`, [companySlug]);
        if (!company[0])
            return 0;
        const rows = await this.dataSource.query(`SELECT COUNT(*)::int AS c FROM jobs WHERE company_id = $1`, [company[0].id]);
        return Number(rows[0]?.c ?? 0);
    }
    async getByCompanyId(companyId) {
        const rows = await this.dataSource.query(`SELECT id, company_id, external_id, title, location, url, description, raw_json, content_hash, status, first_seen_at, last_seen_at, closed_at, created_at, updated_at FROM jobs WHERE company_id = $1`, [companyId]);
        return rows.map(toJobRow);
    }
    async updateLastSeen(jobId, lastSeenAt) {
        await this.dataSource.query(`UPDATE jobs SET last_seen_at = $1, updated_at = $1 WHERE id = $2`, [lastSeenAt, jobId]);
    }
    async markClosedMissing(companyId, seenExternalIds, manager) {
        const q = manager ?? this.dataSource;
        const openJobs = (await q.query(`SELECT id, external_id FROM jobs WHERE company_id = $1 AND status = 'open'`, [companyId]));
        const seen = new Set(seenExternalIds);
        const toClose = openJobs.filter((j) => !seen.has(j.external_id)).map((j) => j.id);
        if (toClose.length === 0)
            return 0;
        const now = new Date().toISOString();
        await q.query(`UPDATE jobs SET status = 'closed', closed_at = $1, updated_at = $1 WHERE id = ANY($2)`, [now, toClose]);
        return toClose.length;
    }
    getJobDetail(jobId) {
        return (0, job_detail_query_1.getJobDetail)(this.dataSource, jobId);
    }
    computeContentHash(input) {
        return computeContentHash(input);
    }
};
exports.JobsRepository = JobsRepository;
exports.JobsRepository = JobsRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], JobsRepository);
function toJobRow(row) {
    return {
        id: row.id,
        companyId: Number(row.company_id),
        externalId: row.external_id,
        title: row.title,
        location: row.location,
        url: row.url,
        description: row.description,
        rawJson: typeof row.raw_json === "string" ? row.raw_json : JSON.stringify(row.raw_json ?? {}),
        contentHash: row.content_hash,
        status: row.status,
        firstSeenAt: row.first_seen_at,
        lastSeenAt: row.last_seen_at,
        closedAt: row.closed_at ?? null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
function toSavedJob(row, company) {
    return {
        id: row.id,
        companyId: row.company_id,
        companySlug: company.slug,
        companyName: company.name || company.slug,
        ats: company.ats || row.ats || "",
        jobId: row.id,
        externalId: row.external_id,
        url: row.url,
        title: row.title,
        location: row.location,
        description: row.description,
        rawJson: row.raw_json,
        contentHash: row.content_hash,
        status: row.status,
        firstSeenAt: row.first_seen_at,
        lastSeenAt: row.last_seen_at,
        closedAt: row.closed_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}
function computeContentHash(value) {
    const rawJson = typeof value.rawJson === "string" ? value.rawJson : JSON.stringify(value.rawJson ?? {});
    return (0, crypto_1.createHash)("sha256")
        .update(JSON.stringify({ title: value.title, location: value.location, url: value.url, description: value.description, rawJson }))
        .digest("hex");
}
//# sourceMappingURL=jobs.repository.js.map
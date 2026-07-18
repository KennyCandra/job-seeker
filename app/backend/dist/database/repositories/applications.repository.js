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
exports.ApplicationsRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
let ApplicationsRepository = class ApplicationsRepository {
    dataSource;
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async create(input) {
        const now = input.createdAt || new Date().toISOString();
        await this.dataSource.query(`INSERT INTO applications (id, job_id, status, score, documents, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
       ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, score = EXCLUDED.score, documents = EXCLUDED.documents, notes = EXCLUDED.notes, updated_at = EXCLUDED.updated_at`, [input.id, input.jobId, input.status ?? "ready", input.score ?? 0, input.documents ?? "[]", input.notes ?? "", now]);
    }
    async getByJobId(jobId) {
        const rows = await this.dataSource.query(`SELECT id, job_id, status, score, documents, notes, created_at, updated_at FROM applications WHERE job_id = $1 LIMIT 1`, [jobId]);
        return rows[0] ? toApplicationRow(rows[0]) : undefined;
    }
    async getAll() {
        const rows = await this.dataSource.query(`SELECT id, job_id, status, score, documents, notes, created_at, updated_at FROM applications ORDER BY created_at DESC`);
        return rows.map(toApplicationRow);
    }
    async updateStatus(jobId, status) {
        await this.dataSource.query(`UPDATE applications SET status = $1, updated_at = $2 WHERE job_id = $3`, [
            status,
            new Date().toISOString(),
            jobId,
        ]);
    }
    async saveAcceptedJob(jobId, score, status) {
        const id = `app-${jobId}-${Date.now().toString(36)}`;
        await this.create({ id, jobId, status, score });
    }
    async getProcessedJobIdsFor(jobIds) {
        if (jobIds.length === 0)
            return [];
        const placeholders = jobIds.map((_, i) => `$${i + 1}`).join(", ");
        const rows = await this.dataSource.query(`SELECT DISTINCT job_id FROM applications WHERE job_id IN (${placeholders}) AND status != 'ready'`, jobIds);
        return rows.map((r) => r.job_id);
    }
    async delete(jobId) {
        await this.dataSource.query(`DELETE FROM applications WHERE job_id = $1`, [jobId]);
    }
    async listCursor(cursorId, limit = 25) {
        const page = Math.max(1, Math.min(100, limit));
        let cursorRow;
        if (cursorId) {
            const rows = await this.dataSource.query(`SELECT id, created_at AS "createdAt" FROM applications WHERE id = $1 LIMIT 1`, [cursorId]);
            cursorRow = rows[0];
        }
        const where = cursorRow
            ? `(a.created_at < $1 OR (a.created_at = $1 AND a.id < $2))`
            : "";
        const params = cursorRow ? [cursorRow.createdAt, cursorRow.id] : [];
        const rows = await this.dataSource.query(`SELECT a.id, a.job_id AS "jobId", a.score, a.status, a.documents, a.notes, a.created_at AS "createdAt", a.updated_at AS "updatedAt",
              c.name AS "company", j.title AS "title", j.location AS "location", c.ats AS "site", j.url AS "url"
       FROM applications a
       INNER JOIN jobs j ON j.id = a.job_id
       INNER JOIN companies c ON c.id = j.company_id
       ${where ? `WHERE ${where}` : ""}
       ORDER BY a.created_at DESC, a.id DESC
       LIMIT $${params.length + 1}`, [...params, page + 1]);
        const items = rows.slice(0, page).map((r) => toApplicationRow(r));
        const last = items[items.length - 1];
        const nextCursor = rows.length > page && last ? last.id : null;
        return { items, nextCursor };
    }
};
exports.ApplicationsRepository = ApplicationsRepository;
exports.ApplicationsRepository = ApplicationsRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], ApplicationsRepository);
function toApplicationRow(row) {
    return {
        id: row.id,
        jobId: row.job_id ?? row.jobId,
        status: row.status,
        score: Number(row.score),
        documents: row.documents,
        notes: row.notes,
        createdAt: row.created_at ?? row.createdAt,
        updatedAt: row.updated_at ?? row.updatedAt,
    };
}
//# sourceMappingURL=applications.repository.js.map
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
exports.JobDocumentsRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
let JobDocumentsRepository = class JobDocumentsRepository {
    dataSource;
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async save(input) {
        const now = input.createdAt || new Date().toISOString();
        await this.dataSource.query(`INSERT INTO job_documents (id, job_id, type, status, content, file_path, metadata, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
       ON CONFLICT (id) DO UPDATE SET type = EXCLUDED.type, status = EXCLUDED.status, content = EXCLUDED.content, file_path = EXCLUDED.file_path, metadata = EXCLUDED.metadata, updated_at = EXCLUDED.updated_at`, [
            input.id,
            input.jobId,
            input.type,
            input.status ?? "ready",
            input.content ?? "",
            input.filePath ?? "",
            JSON.stringify(input.metadata ?? {}),
            input.createdBy ?? "system",
            now,
        ]);
    }
    async getById(id) {
        const rows = await this.dataSource.query(`SELECT id, job_id, type, status, content, file_path, metadata, created_by, created_at, updated_at FROM job_documents WHERE id = $1 LIMIT 1`, [id]);
        return rows[0]
            ? { ...rows[0], jobId: rows[0].job_id, filePath: rows[0].file_path, createdBy: rows[0].created_by }
            : undefined;
    }
    async getByJobId(jobId) {
        const rows = await this.dataSource.query(`SELECT id, job_id, type, status, content, file_path, metadata, created_by, created_at, updated_at FROM job_documents WHERE job_id = $1 ORDER BY created_at DESC, id ASC`, [jobId]);
        return rows.map((r) => ({
            id: r.id,
            jobId: r.job_id,
            type: r.type,
            status: r.status,
            content: r.content,
            filePath: r.file_path,
            metadata: r.metadata,
            createdBy: r.created_by,
            createdAt: r.created_at,
            updatedAt: r.updated_at,
        }));
    }
};
exports.JobDocumentsRepository = JobDocumentsRepository;
exports.JobDocumentsRepository = JobDocumentsRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], JobDocumentsRepository);
//# sourceMappingURL=job-documents.repository.js.map
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
exports.ApplicationRunsRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
let ApplicationRunsRepository = class ApplicationRunsRepository {
    dataSource;
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async create(input) {
        const now = input.createdAt || new Date().toISOString();
        await this.dataSource.query(`INSERT INTO application_runs (id, job_id, status, profile_path, output_dir, current_url, error, summary, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)`, [
            input.id,
            input.jobId,
            input.status ?? "running",
            input.profilePath ?? "",
            input.outputDir ?? "",
            input.currentUrl ?? "",
            input.error ?? null,
            JSON.stringify(input.summary ?? {}),
            now,
        ]);
    }
    async getById(runId) {
        const rows = await this.dataSource.query(`SELECT id, job_id AS "jobId", status, profile_path AS "profilePath", output_dir AS "outputDir",
              current_url AS "currentUrl", error, summary, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM application_runs WHERE id = $1 LIMIT 1`, [runId]);
        return rows[0] || null;
    }
    async getLatestByJobId(jobId) {
        const rows = await this.dataSource.query(`SELECT id, job_id AS "jobId", status, profile_path AS "profilePath", output_dir AS "outputDir",
              current_url AS "currentUrl", error, summary, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM application_runs WHERE job_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1`, [jobId]);
        return rows[0] || null;
    }
    async updateStatus(runId, status, patch = {}) {
        const sets = ["status = $2", "updated_at = $3"];
        const params = [runId, status, new Date().toISOString()];
        let i = 4;
        if (patch.currentUrl !== undefined) {
            sets.push(`current_url = $${i++}`);
            params.push(patch.currentUrl);
        }
        if (patch.outputDir !== undefined) {
            sets.push(`output_dir = $${i++}`);
            params.push(patch.outputDir);
        }
        if (patch.error !== undefined) {
            sets.push(`error = $${i++}`);
            params.push(patch.error);
        }
        if (patch.summary !== undefined) {
            sets.push(`summary = $${i++}`);
            params.push(JSON.stringify(patch.summary));
        }
        await this.dataSource.query(`UPDATE application_runs SET ${sets.join(", ")} WHERE id = $1`, params);
    }
};
exports.ApplicationRunsRepository = ApplicationRunsRepository;
exports.ApplicationRunsRepository = ApplicationRunsRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], ApplicationRunsRepository);
//# sourceMappingURL=application-runs.repository.js.map
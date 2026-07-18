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
exports.TaskRunsRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const TASK_RUN_COLUMNS = `id, bull_job_id AS "bullJobId", type, status, dedupe_key AS "dedupeKey",
  payload_json AS "payloadJson", progress_json AS "progressJson", result_json AS "resultJson",
  error, created_at AS "createdAt", started_at AS "startedAt", completed_at AS "completedAt",
  updated_at AS "updatedAt"`;
let TaskRunsRepository = class TaskRunsRepository {
    dataSource;
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async create(input, manager) {
        const q = manager ?? this.dataSource;
        await q.query(`INSERT INTO task_runs (id, bull_job_id, type, status, dedupe_key, payload_json, progress_json, result_json, error, created_at, started_at, completed_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`, [
            input.id,
            input.bullJobId,
            input.type,
            input.status,
            input.dedupeKey,
            input.payloadJson,
            input.progressJson,
            input.resultJson,
            input.error,
            input.createdAt,
            input.startedAt,
            input.completedAt,
            input.updatedAt,
        ]);
    }
    async getById(id) {
        const rows = await this.dataSource.query(`SELECT ${TASK_RUN_COLUMNS} FROM task_runs WHERE id = $1 LIMIT 1`, [id]);
        return rows[0];
    }
    async getByStatus(status) {
        const rows = await this.dataSource.query(`SELECT ${TASK_RUN_COLUMNS} FROM task_runs WHERE status = $1 ORDER BY created_at DESC`, [status]);
        return rows;
    }
    async findActiveByDedupeKey(dedupeKey) {
        const rows = await this.dataSource.query(`SELECT ${TASK_RUN_COLUMNS} FROM task_runs WHERE dedupe_key = $1 AND status IN ('queued', 'running') LIMIT 1`, [dedupeKey]);
        return rows[0];
    }
    async updateStatus(id, status) {
        const now = new Date().toISOString();
        const updates = { status, updated_at: now };
        if (status === "running")
            updates.started_at = now;
        if (["completed", "failed", "cancelled"].includes(status))
            updates.completed_at = now;
        const sets = Object.keys(updates)
            .map((k, i) => `${toSnake(k)} = $${i + 2}`)
            .join(", ");
        await this.dataSource.query(`UPDATE task_runs SET ${sets} WHERE id = $1`, [id, ...Object.values(updates)]);
    }
    async updateBullJobId(id, bullJobId, manager) {
        const q = manager ?? this.dataSource;
        await q.query(`UPDATE task_runs SET bull_job_id = $1, updated_at = $2 WHERE id = $3`, [
            bullJobId,
            new Date().toISOString(),
            id,
        ]);
    }
    async updateProgress(id, progress) {
        await this.dataSource.query(`UPDATE task_runs SET progress_json = $1, updated_at = $2 WHERE id = $3`, [
            JSON.stringify(progress),
            new Date().toISOString(),
            id,
        ]);
    }
    async updateResult(id, result) {
        await this.dataSource.query(`UPDATE task_runs SET result_json = $1, status = 'completed', completed_at = $2, updated_at = $2 WHERE id = $3`, [JSON.stringify(result), new Date().toISOString(), id]);
    }
    async listRecent(limit = 100, status) {
        if (status) {
            const rows = await this.dataSource.query(`SELECT ${TASK_RUN_COLUMNS} FROM task_runs WHERE status = $2 ORDER BY created_at DESC LIMIT $1`, [limit, status]);
            return rows;
        }
        const rows = await this.dataSource.query(`SELECT ${TASK_RUN_COLUMNS} FROM task_runs ORDER BY created_at DESC LIMIT $1`, [limit]);
        return rows;
    }
    async countByStatuses() {
        const rows = await this.dataSource.query(`SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'queued')::int AS queued,
      COUNT(*) FILTER (WHERE status = 'running')::int AS running,
      COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
      COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
      COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled
      FROM task_runs`);
        return rows[0];
    }
    async getStatusesByIds(ids) {
        if (ids.length === 0)
            return [];
        return this.dataSource.query(`SELECT id, status FROM task_runs WHERE id = ANY($1)`, [ids]);
    }
    async updateError(id, error) {
        await this.dataSource.query(`UPDATE task_runs SET error = $1, status = 'failed', completed_at = $2, updated_at = $2 WHERE id = $3`, [error, new Date().toISOString(), id]);
    }
};
exports.TaskRunsRepository = TaskRunsRepository;
exports.TaskRunsRepository = TaskRunsRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], TaskRunsRepository);
function toSnake(k) {
    return k.replace(/[A-Z]/g, (m) => "_" + m.toLowerCase());
}
//# sourceMappingURL=task-runs.repository.js.map
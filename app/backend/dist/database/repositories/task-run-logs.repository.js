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
exports.TaskRunLogsRepository = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const TASK_RUN_LOG_COLUMNS = `id, run_id AS "runId", level, message,
  payload_json AS "payloadJson", created_at AS "createdAt"`;
function shortId() {
    return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`.slice(0, 12);
}
let TaskRunLogsRepository = class TaskRunLogsRepository {
    dataSource;
    constructor(dataSource) {
        this.dataSource = dataSource;
    }
    async create(runId, level, message, payload) {
        const id = `log_${shortId()}`;
        await this.dataSource.query(`INSERT INTO task_run_logs (id, run_id, level, message, payload_json, created_at) VALUES ($1, $2, $3, $4, $5, $6)`, [id, runId, level, message, payload ? JSON.stringify(payload) : null, new Date().toISOString()]);
        return id;
    }
    async getByRunId(runId, limit = 200) {
        const rows = await this.dataSource.query(`SELECT ${TASK_RUN_LOG_COLUMNS} FROM task_run_logs WHERE run_id = $1 ORDER BY created_at DESC, id ASC LIMIT $2`, [runId, limit]);
        const all = rows;
        return all.reverse();
    }
    async getAfter(runId, cursor, limit = 200) {
        let sql = `SELECT ${TASK_RUN_LOG_COLUMNS} FROM task_run_logs WHERE run_id = $1`;
        const params = [runId];
        if (cursor) {
            sql += ` AND (created_at > $2 OR (created_at = $2 AND id > $3))`;
            params.push(cursor.createdAt, cursor.id);
        }
        sql += ` ORDER BY created_at ASC, id ASC LIMIT $${params.length + 1}`;
        params.push(limit);
        const rows = await this.dataSource.query(sql, params);
        return rows;
    }
};
exports.TaskRunLogsRepository = TaskRunLogsRepository;
exports.TaskRunLogsRepository = TaskRunLogsRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource])
], TaskRunLogsRepository);
//# sourceMappingURL=task-run-logs.repository.js.map
import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";
import type { TaskRunLogRecord } from "../../tasks/types";

// Alias snake_case columns to camelCase; never SELECT *. (See ./index.ts.)
const TASK_RUN_LOG_COLUMNS = `id, run_id AS "runId", level, message,
  payload_json AS "payloadJson", created_at AS "createdAt"`;

function shortId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`.slice(0, 12);
}

@Injectable()
export class TaskRunLogsRepository {
  constructor(private readonly dataSource: DataSource) {}

  async create(runId: string, level: string, message: string, payload?: Record<string, unknown>): Promise<string> {
    const id = `log_${shortId()}`;
    await this.dataSource.query(
      `INSERT INTO task_run_logs (id, run_id, level, message, payload_json, created_at) VALUES ($1, $2, $3, $4, $5, $6)`,
      [id, runId, level, message, payload ? JSON.stringify(payload) : null, new Date().toISOString()],
    );
    return id;
  }

  async getByRunId(runId: string, limit = 200): Promise<TaskRunLogRecord[]> {
    const rows = await this.dataSource.query(
      `SELECT ${TASK_RUN_LOG_COLUMNS} FROM task_run_logs WHERE run_id = $1 ORDER BY created_at DESC, id ASC LIMIT $2`,
      [runId, limit],
    );
    const all = rows as TaskRunLogRecord[];
    return all.reverse();
  }

  async getAfter(
    runId: string,
    cursor: { createdAt: string; id: string } | null,
    limit = 200,
  ): Promise<TaskRunLogRecord[]> {
    let sql = `SELECT ${TASK_RUN_LOG_COLUMNS} FROM task_run_logs WHERE run_id = $1`;
    const params: unknown[] = [runId];
    if (cursor) {
      sql += ` AND (created_at > $2 OR (created_at = $2 AND id > $3))`;
      params.push(cursor.createdAt, cursor.id);
    }
    sql += ` ORDER BY created_at ASC, id ASC LIMIT $${params.length + 1}`;
    params.push(limit);
    const rows = await this.dataSource.query(sql, params);
    return rows as TaskRunLogRecord[];
  }
}

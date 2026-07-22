import { Injectable } from "@nestjs/common";
import { DataSource, type EntityManager } from "typeorm";
import type { TaskType, TaskStatus, TaskRunRecord, TaskRunLogRecord } from "../../tasks/types";

// Repositories must alias snake_case columns to camelCase; never SELECT *.
// (See the convention note in ./index.ts.) Kept in one place so every read of
// task_runs returns rows shaped exactly like TaskRunRecord.
const TASK_RUN_COLUMNS = `id, bull_job_id AS "bullJobId", type, status, dedupe_key AS "dedupeKey",
  payload_json AS "payloadJson", progress_json AS "progressJson", result_json AS "resultJson",
  error, created_at AS "createdAt", started_at AS "startedAt", completed_at AS "completedAt",
  updated_at AS "updatedAt"`;

export type CreateTaskRunInput = {
  id: string;
  bullJobId: string | null;
  type: TaskType;
  status: TaskStatus;
  dedupeKey: string | null;
  payloadJson: string;
  progressJson: string | null;
  resultJson: string | null;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
};

@Injectable()
export class TaskRunsRepository {
  constructor(private readonly dataSource: DataSource) {}

  async create(input: CreateTaskRunInput, manager?: EntityManager): Promise<void> {
    const q = manager ?? this.dataSource;
    await q.query(
      `INSERT INTO task_runs (id, bull_job_id, type, status, dedupe_key, payload_json, progress_json, result_json, error, created_at, started_at, completed_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
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
      ],
    );
  }

  async getById(id: string): Promise<TaskRunRecord | undefined> {
    const rows = await this.dataSource.query(`SELECT ${TASK_RUN_COLUMNS} FROM task_runs WHERE id = $1 LIMIT 1`, [id]);
    return rows[0] as TaskRunRecord | undefined;
  }

  async getByStatus(status: TaskStatus): Promise<TaskRunRecord[]> {
    const rows = await this.dataSource.query(`SELECT ${TASK_RUN_COLUMNS} FROM task_runs WHERE status = $1 ORDER BY created_at DESC`, [status]);
    return rows as TaskRunRecord[];
  }

  async findActiveByDedupeKey(dedupeKey: string): Promise<TaskRunRecord | undefined> {
    const rows = await this.dataSource.query(
      `SELECT ${TASK_RUN_COLUMNS} FROM task_runs WHERE dedupe_key = $1 AND status IN ('queued', 'running') LIMIT 1`,
      [dedupeKey],
    );
    return rows[0] as TaskRunRecord | undefined;
  }

  async updateStatus(id: string, status: TaskStatus): Promise<void> {
    const now = new Date().toISOString();
    const updates: Record<string, unknown> = { status, updated_at: now };
    if (status === "running") updates.started_at = now;
    if (["completed", "failed", "cancelled"].includes(status)) updates.completed_at = now;
    const sets = Object.keys(updates)
      .map((k, i) => `${toSnake(k)} = $${i + 2}`)
      .join(", ");
    await this.dataSource.query(`UPDATE task_runs SET ${sets} WHERE id = $1`, [id, ...Object.values(updates)]);
  }

  async updateProgress(id: string, progress: unknown): Promise<void> {
    await this.dataSource.query(`UPDATE task_runs SET progress_json = $1, updated_at = $2 WHERE id = $3`, [
      JSON.stringify(progress),
      new Date().toISOString(),
      id,
    ]);
  }

  async updateResult(id: string, result: unknown): Promise<void> {
    await this.dataSource.query(
      `UPDATE task_runs SET result_json = $1, status = 'completed', completed_at = $2, updated_at = $2 WHERE id = $3`,
      [JSON.stringify(result), new Date().toISOString(), id],
    );
  }

  async listRecent(limit = 100, status?: TaskStatus): Promise<TaskRunRecord[]> {
    if (status) {
      const rows = await this.dataSource.query(
        `SELECT ${TASK_RUN_COLUMNS} FROM task_runs WHERE status = $2 ORDER BY created_at DESC LIMIT $1`,
        [limit, status],
      );
      return rows as TaskRunRecord[];
    }
    const rows = await this.dataSource.query(
      `SELECT ${TASK_RUN_COLUMNS} FROM task_runs ORDER BY created_at DESC LIMIT $1`,
      [limit],
    );
    return rows as TaskRunRecord[];
  }

  async countByStatuses(): Promise<{
    total: number;
    queued: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
  }> {
    const rows = await this.dataSource.query(`SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'queued')::int AS queued,
      COUNT(*) FILTER (WHERE status = 'running')::int AS running,
      COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
      COUNT(*) FILTER (WHERE status = 'failed')::int AS failed,
      COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled
      FROM task_runs`);
    return rows[0];
  }

  async getStatusesByIds(ids: string[]): Promise<Array<{ id: string; status: TaskStatus }>> {
    if (ids.length === 0) return [];
    return this.dataSource.query(`SELECT id, status FROM task_runs WHERE id = ANY($1)`, [ids]);
  }

  /** Most recent completed runs of one type — used by the scheduler's catch-up check. */
  async getRecentCompletedByType(type: TaskType, limit = 20): Promise<TaskRunRecord[]> {
    const rows = await this.dataSource.query(
      `SELECT ${TASK_RUN_COLUMNS} FROM task_runs WHERE type = $1 AND status = 'completed' ORDER BY completed_at DESC LIMIT $2`,
      [type, limit],
    );
    return rows as TaskRunRecord[];
  }

  async updateError(id: string, error: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE task_runs SET error = $1, status = 'failed', completed_at = $2, updated_at = $2 WHERE id = $3`,
      [error, new Date().toISOString(), id],
    );
  }
}

function toSnake(k: string): string {
  return k.replace(/[A-Z]/g, (m) => "_" + m.toLowerCase());
}

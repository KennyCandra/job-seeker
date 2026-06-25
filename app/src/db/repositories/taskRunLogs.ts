import { and, asc, desc, eq, gt, or } from "drizzle-orm";
import { Repository } from "../repository";
import { taskRunLogs } from "../schema";
import type { TaskRunLogRecord } from "../../queue/types";

export class TaskRunLogsRepository extends Repository {
  async create(runId: string, level: string, message: string, payload?: Record<string, unknown>): Promise<string> {
    const id = `log_${shortId()}`;
    await this.db.insert(taskRunLogs).values({
      id,
      runId,
      level,
      message,
      payloadJson: payload ? JSON.stringify(payload) : null,
      createdAt: new Date().toISOString(),
    });
    return id;
  }

  async getByRunId(runId: string, limit = 200): Promise<TaskRunLogRecord[]> {
    const rows = await this.db.select().from(taskRunLogs)
      .where(eq(taskRunLogs.runId, runId))
      .orderBy(desc(taskRunLogs.createdAt))
      .limit(limit);
    return rows.reverse() as TaskRunLogRecord[];
  }

  async getRecentByRunId(runId: string, sinceId: string): Promise<TaskRunLogRecord[]> {
    const all = await this.getByRunId(runId);
    const idx = all.findIndex((l) => l.id === sinceId);
    if (idx === -1) return all;
    return all.slice(idx + 1);
  }

  async getAfter(runId: string, cursor: { createdAt: string; id: string } | null, limit = 200): Promise<TaskRunLogRecord[]> {
    const where = cursor
      ? and(
          eq(taskRunLogs.runId, runId),
          or(
            gt(taskRunLogs.createdAt, cursor.createdAt),
            and(eq(taskRunLogs.createdAt, cursor.createdAt), gt(taskRunLogs.id, cursor.id)),
          ),
        )
      : eq(taskRunLogs.runId, runId);

    const rows = await this.db.select().from(taskRunLogs)
      .where(where)
      .orderBy(asc(taskRunLogs.createdAt), asc(taskRunLogs.id))
      .limit(limit);
    return rows as TaskRunLogRecord[];
  }
}

function shortId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`.slice(0, 12);
}

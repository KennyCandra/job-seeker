import { eq, desc } from "drizzle-orm";
import { Repository } from "../repository";
import { taskRunLogs } from "../schema";
import type { TaskRunLogRecord } from "../../queue/types";

export class TaskRunLogsRepository extends Repository {
  create(runId: string, level: string, message: string, payload?: Record<string, unknown>): string {
    const id = `log_${shortId()}`;
    this.db.insert(taskRunLogs).values({
      id,
      runId,
      level,
      message,
      payloadJson: payload ? JSON.stringify(payload) : null,
      createdAt: new Date().toISOString(),
    }).run();
    return id;
  }

  getByRunId(runId: string, limit = 200): TaskRunLogRecord[] {
    return this.db.select().from(taskRunLogs)
      .where(eq(taskRunLogs.runId, runId))
      .orderBy(desc(taskRunLogs.createdAt))
      .limit(limit)
      .all()
      .reverse() as TaskRunLogRecord[];
  }

  getRecentByRunId(runId: string, sinceId: string): TaskRunLogRecord[] {
    const all = this.getByRunId(runId);
    const idx = all.findIndex((l) => l.id === sinceId);
    if (idx === -1) return all;
    return all.slice(idx + 1);
  }
}

function shortId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`.slice(0, 12);
}

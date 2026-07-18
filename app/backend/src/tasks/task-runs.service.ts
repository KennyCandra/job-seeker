import { Injectable } from "@nestjs/common";
import { TaskRunsRepository, TaskRunLogsRepository } from "../database/repositories";
import type { TaskRunRecord, TaskRunLogRecord, TaskStatus } from "./types";

@Injectable()
export class TaskRunsService {
  constructor(
    private readonly taskRuns: TaskRunsRepository,
    private readonly taskRunLogs: TaskRunLogsRepository,
  ) {}

  list(limit = 100, status?: TaskStatus): Promise<TaskRunRecord[]> {
    return this.taskRuns.listRecent(limit, status);
  }

  countByStatuses() {
    return this.taskRuns.countByStatuses();
  }

  get(runId: string): Promise<TaskRunRecord | null> {
    return this.taskRuns.getById(runId).then((r) => r ?? null);
  }

  getLogs(runId: string): Promise<TaskRunLogRecord[]> {
    return this.taskRunLogs.getByRunId(runId);
  }

  async getStatuses(runIds: string[]): Promise<Record<string, string>> {
    const rows = await this.taskRuns.getStatusesByIds(runIds);
    const found = new Map(rows.map((r) => [r.id, r.status]));
    const out: Record<string, string> = {};
    for (const id of runIds) {
      out[id] = found.get(id) ?? "unknown";
    }
    return out;
  }
}

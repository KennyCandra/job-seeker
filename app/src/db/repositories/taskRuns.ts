import { eq, and, desc, sql } from "drizzle-orm";
import { Repository } from "../repository";
import { taskRuns } from "../schema";
import type { TaskType, TaskStatus, TaskRunRecord } from "../../queue/types";

type CreateTaskRunInput = {
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

export class TaskRunsRepository extends Repository {
  async create(input: CreateTaskRunInput): Promise<void> {
    await this.db.insert(taskRuns).values(input);
  }

  async getById(id: string): Promise<TaskRunRecord | undefined> {
    const [row] = await this.db.select().from(taskRuns).where(eq(taskRuns.id, id)).limit(1);
    return row as TaskRunRecord | undefined;
  }

  async getAll(limit = 50): Promise<TaskRunRecord[]> {
    return this.db.select().from(taskRuns)
      .orderBy(desc(taskRuns.createdAt))
      .limit(limit) as Promise<TaskRunRecord[]>;
  }

  async getByStatus(status: TaskStatus): Promise<TaskRunRecord[]> {
    return this.db.select().from(taskRuns)
      .where(eq(taskRuns.status, status))
      .orderBy(desc(taskRuns.createdAt)) as Promise<TaskRunRecord[]>;
  }

  async findActiveByDedupeKey(dedupeKey: string): Promise<TaskRunRecord | undefined> {
    const [row] = await this.db.select().from(taskRuns)
      .where(and(eq(taskRuns.dedupeKey, dedupeKey), sql`${taskRuns.status} IN ('queued', 'running')`))
      .limit(1);
    return row as TaskRunRecord | undefined;
  }

  async updateStatus(id: string, status: TaskStatus): Promise<void> {
    const now = new Date().toISOString();
    const updates: Record<string, any> = { status, updatedAt: now };
    if (status === "running") updates.startedAt = now;
    if (status === "completed") updates.completedAt = now;
    if (status === "failed") updates.completedAt = now;
    if (status === "cancelled") updates.completedAt = now;
    await this.db.update(taskRuns).set(updates).where(eq(taskRuns.id, id));
  }

  async updateBullJobId(id: string, bullJobId: string): Promise<void> {
    await this.db.update(taskRuns).set({ bullJobId, updatedAt: new Date().toISOString() }).where(eq(taskRuns.id, id));
  }

  async updateProgress(id: string, progress: Record<string, unknown>): Promise<void> {
    await this.db.update(taskRuns).set({
      progressJson: JSON.stringify(progress),
      updatedAt: new Date().toISOString(),
    }).where(eq(taskRuns.id, id));
  }

  async updateResult(id: string, result: Record<string, unknown>): Promise<void> {
    await this.db.update(taskRuns).set({
      resultJson: JSON.stringify(result),
      status: "completed",
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).where(eq(taskRuns.id, id));
  }

  async updateError(id: string, error: string): Promise<void> {
    await this.db.update(taskRuns).set({
      error,
      status: "failed",
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).where(eq(taskRuns.id, id));
  }
}

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
  create(input: CreateTaskRunInput): void {
    this.db.insert(taskRuns).values(input).run();
  }

  getById(id: string): TaskRunRecord | undefined {
    return this.db.select().from(taskRuns).where(eq(taskRuns.id, id)).get() as TaskRunRecord | undefined;
  }

  getAll(limit = 50): TaskRunRecord[] {
    return this.db.select().from(taskRuns)
      .orderBy(desc(taskRuns.createdAt))
      .limit(limit)
      .all() as TaskRunRecord[];
  }

  getByStatus(status: TaskStatus): TaskRunRecord[] {
    return this.db.select().from(taskRuns)
      .where(eq(taskRuns.status, status))
      .orderBy(desc(taskRuns.createdAt))
      .all() as TaskRunRecord[];
  }

  findActiveByDedupeKey(dedupeKey: string): TaskRunRecord | undefined {
    return this.db.select().from(taskRuns)
      .where(and(eq(taskRuns.dedupeKey, dedupeKey), sql`${taskRuns.status} IN ('queued', 'running')`))
      .get() as TaskRunRecord | undefined;
  }

  updateStatus(id: string, status: TaskStatus): void {
    const now = new Date().toISOString();
    const updates: Record<string, any> = { status, updatedAt: now };
    if (status === "running") updates.startedAt = now;
    if (status === "completed") updates.completedAt = now;
    if (status === "failed") updates.completedAt = now;
    if (status === "cancelled") updates.completedAt = now;
    this.db.update(taskRuns).set(updates).where(eq(taskRuns.id, id)).run();
  }

  updateBullJobId(id: string, bullJobId: string): void {
    this.db.update(taskRuns).set({ bullJobId, updatedAt: new Date().toISOString() }).where(eq(taskRuns.id, id)).run();
  }

  updateProgress(id: string, progress: Record<string, unknown>): void {
    this.db.update(taskRuns).set({
      progressJson: JSON.stringify(progress),
      updatedAt: new Date().toISOString(),
    }).where(eq(taskRuns.id, id)).run();
  }

  updateResult(id: string, result: Record<string, unknown>): void {
    this.db.update(taskRuns).set({
      resultJson: JSON.stringify(result),
      status: "completed",
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).where(eq(taskRuns.id, id)).run();
  }

  updateError(id: string, error: string): void {
    this.db.update(taskRuns).set({
      error,
      status: "failed",
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }).where(eq(taskRuns.id, id)).run();
  }
}

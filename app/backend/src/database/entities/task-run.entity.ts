import { Entity, PrimaryColumn, Column, Index, OneToMany } from "typeorm";
import type { TaskRunLog } from "./task-run-log.entity";

@Entity("task_runs")
@Index("idx_task_runs_status", ["status"])
@Index("idx_task_runs_type", ["type"])
@Index("idx_task_runs_dedupe_key", ["dedupeKey"])
@Index("idx_task_runs_created_at", ["createdAt"])
@Index("idx_task_runs_status_created", ["status", "createdAt"])
export class TaskRun {
  @PrimaryColumn({ type: "text" })
  id: string;

  @OneToMany("TaskRunLog", (log: any) => log.run)
  logs: TaskRunLog[];

  @Column({ name: "bull_job_id", type: "text", nullable: true })
  bullJobId: string | null;

  @Column({ type: "text", nullable: false })
  type: string;

  @Column({ type: "text", nullable: false, default: "queued" })
  status: string;

  @Column({ name: "dedupe_key", type: "text", nullable: true })
  dedupeKey: string | null;

  @Column({ name: "payload_json", type: "text", nullable: false, default: "{}" })
  payloadJson: string;

  @Column({ name: "progress_json", type: "text", nullable: true })
  progressJson: string | null;

  @Column({ name: "result_json", type: "text", nullable: true })
  resultJson: string | null;

  @Column({ type: "text", nullable: true })
  error: string | null;

  @Column({ name: "created_at", type: "text", nullable: false })
  createdAt: string;

  @Column({ name: "started_at", type: "text", nullable: true })
  startedAt: string | null;

  @Column({ name: "completed_at", type: "text", nullable: true })
  completedAt: string | null;

  @Column({ name: "updated_at", type: "text", nullable: false })
  updatedAt: string;
}

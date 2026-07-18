import { Entity, PrimaryColumn, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import type { TaskRun } from "./task-run.entity";

@Entity("task_run_logs")
@Index("idx_task_run_logs_run", ["runId"])
@Index("idx_task_run_logs_run_created", ["runId", "createdAt"])
export class TaskRunLog {
  @PrimaryColumn({ type: "text" })
  id: string;

  @Column({ name: "run_id", type: "text", nullable: false })
  runId: string;

  @ManyToOne("TaskRun", (run: any) => run.logs, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinColumn({ name: "run_id" })
  run: TaskRun;

  @Column({ type: "text", nullable: false, default: "info" })
  level: string;

  @Column({ type: "text", nullable: false })
  message: string;

  @Column({ name: "payload_json", type: "text", nullable: true })
  payloadJson: string | null;

  @Column({ name: "created_at", type: "text", nullable: false })
  createdAt: string;
}

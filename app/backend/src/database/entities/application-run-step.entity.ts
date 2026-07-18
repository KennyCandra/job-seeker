import { Entity, PrimaryColumn, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import type { ApplicationRun } from "./application-run.entity";

@Entity("application_run_steps")
@Index("idx_app_run_steps_run", ["runId"])
@Index("idx_app_run_steps_run_created", ["runId", "createdAt"])
export class ApplicationRunStep {
  @PrimaryColumn({ type: "text" })
  id: string;

  @Column({ name: "run_id", type: "text", nullable: false })
  runId: string;

  @ManyToOne("ApplicationRun", (run: any) => run.steps, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinColumn({ name: "run_id" })
  run: ApplicationRun;

  @Column({ type: "text", nullable: false })
  type: string;

  @Column({ type: "text", nullable: false, default: "" })
  label: string;

  @Column({ type: "text", nullable: false, default: "" })
  detail: string;

  @Column({ name: "screenshot_path", type: "text", nullable: true })
  screenshotPath: string | null;

  @Column({ type: "text", nullable: false, default: "{}" })
  payload: string;

  @Column({ name: "created_at", type: "text", nullable: false })
  createdAt: string;
}

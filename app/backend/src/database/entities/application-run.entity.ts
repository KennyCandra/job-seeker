import { Entity, PrimaryColumn, Column, Index, ManyToOne, OneToMany, JoinColumn } from "typeorm";
import type { Job } from "./job.entity";
import { ApplicationRunStep } from "./application-run-step.entity";

@Entity("application_runs")
@Index("idx_app_runs_job_status", ["jobId", "status"])
@Index("idx_app_runs_job_created", ["jobId", "createdAt"])
export class ApplicationRun {
  @PrimaryColumn({ type: "text" })
  id: string;

  @Column({ name: "job_id", type: "text", nullable: false })
  jobId: string;

  @ManyToOne("Job", (job: any) => job.applicationRuns, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinColumn({ name: "job_id" })
  job: Job;

  @OneToMany(() => ApplicationRunStep, (step) => step.run)
  steps: ApplicationRunStep[];

  @Column({ type: "text", nullable: false, default: "running" })
  status: string;

  @Column({ name: "profile_path", type: "text", nullable: false, default: "" })
  profilePath: string;

  @Column({ name: "output_dir", type: "text", nullable: false, default: "" })
  outputDir: string;

  @Column({ name: "current_url", type: "text", nullable: false, default: "" })
  currentUrl: string;

  @Column({ type: "text", nullable: true })
  error: string | null;

  @Column({ type: "text", nullable: false, default: "{}" })
  summary: string;

  @Column({ name: "created_at", type: "text", nullable: false })
  createdAt: string;

  @Column({ name: "updated_at", type: "text", nullable: false })
  updatedAt: string;
}

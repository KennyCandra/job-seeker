import { Entity, PrimaryColumn, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import type { Job } from "./job.entity";

@Entity("applications")
@Index("idx_applications_score_created", ["score", "createdAt"])
@Index("idx_applications_created_at", ["createdAt"])
@Index("idx_applications_created_desc_id", ["createdAt", "id"])
export class Application {
  @PrimaryColumn({ type: "text" })
  id: string;

  @Column({ name: "job_id", type: "text", nullable: false, unique: true })
  jobId: string;

  @ManyToOne("Job", (job: any) => job.applications, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinColumn({ name: "job_id" })
  job: Job;

  @Column({ type: "text", nullable: false, default: "ready" })
  status: string;

  @Column({ type: "integer", nullable: false, default: 0 })
  score: number;

  @Column({ type: "text", nullable: false, default: "[]" })
  documents: string;

  @Column({ type: "text", nullable: false, default: "" })
  notes: string;

  @Column({ name: "created_at", type: "text", nullable: false })
  createdAt: string;

  @Column({ name: "updated_at", type: "text", nullable: false })
  updatedAt: string;
}

import { Entity, PrimaryColumn, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import type { Job } from "./job.entity";

@Entity("job_documents")
@Index("idx_job_documents_job_type", ["jobId", "type"])
export class JobDocument {
  @PrimaryColumn({ type: "text" })
  id: string;

  @Column({ name: "job_id", type: "text", nullable: false })
  jobId: string;

  @ManyToOne("Job", (job: any) => job.documents, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinColumn({ name: "job_id" })
  job: Job;

  @Column({ type: "text", nullable: false })
  type: string;

  @Column({ type: "text", nullable: false, default: "ready" })
  status: string;

  @Column({ type: "text", nullable: false, default: "" })
  content: string;

  @Column({ name: "file_path", type: "text", nullable: false, default: "" })
  filePath: string;

  @Column({ type: "text", nullable: false, default: "{}" })
  metadata: string;

  @Column({ name: "created_by", type: "text", nullable: false, default: "system" })
  createdBy: string;

  @Column({ name: "created_at", type: "text", nullable: false })
  createdAt: string;

  @Column({ name: "updated_at", type: "text", nullable: false })
  updatedAt: string;
}

import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from "typeorm";
import type { Job } from "./job.entity";

@Entity({ name: "job_filters" })
export class JobFilterEntity {
  @PrimaryColumn({ type: "text" })
  id!: string;

  @Column({ type: "text", name: "job_id" })
  jobId!: string;

  @ManyToOne("Job", (job: any) => job.filters, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinColumn({ name: "job_id" })
  job!: Job;

  @Column({ type: "text", name: "content_hash", default: "" })
  contentHash!: string;

  @Column({ type: "text", name: "verdict", default: "reject" })
  verdict!: string;

  @Column({ type: "integer", name: "score", default: 0 })
  score!: number;

  @Column({ type: "text", name: "reasons", default: "[]" })
  reasons!: string;

  @Column({ type: "text", name: "must_have_hits", default: "[]" })
  mustHaveHits!: string;

  @Column({ type: "text", name: "missing_items", default: "[]" })
  missingItems!: string;

  @Column({ type: "text", name: "model", default: "" })
  model!: string;

  @Column({ type: "text", name: "prompt_version", default: "" })
  promptVersion!: string;

  @Column({ type: "text", name: "created_at" })
  createdAt!: string;
}

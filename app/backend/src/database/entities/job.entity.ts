import { Entity, PrimaryColumn, Column, Index, ManyToOne, OneToMany, JoinColumn } from "typeorm";
import { Company } from "./company.entity";
import { JobDocument } from "./job-document.entity";
import { Application } from "./application.entity";
import { ApplicationRun } from "./application-run.entity";
import { JobFilterEntity } from "./job-filter.entity";

@Entity("jobs")
@Index("idx_jobs_company_external", ["companyId", "externalId"], { unique: true })
@Index("idx_jobs_company", ["companyId"])
@Index("idx_jobs_status", ["status"])
@Index("idx_jobs_updated_at", ["updatedAt"])
@Index("idx_jobs_updated_id", ["updatedAt", "id"])
@Index("idx_jobs_status_updated_at", ["status", "updatedAt"])
@Index("idx_jobs_status_updated_id", ["status", "updatedAt", "id"])
@Index("idx_jobs_company_updated_at", ["companyId", "updatedAt"])
@Index("idx_jobs_company_status_updated", ["companyId", "status", "updatedAt"])
export class Job {
  @PrimaryColumn({ type: "text" })
  id: string;

  @Column({ name: "company_id", type: "integer", nullable: false })
  companyId: number;

  @ManyToOne(() => Company, (company) => company.jobs, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinColumn({ name: "company_id" })
  company: Company;

  @OneToMany(() => JobDocument, (doc) => doc.job)
  documents: JobDocument[];

  @OneToMany(() => Application, (application) => application.job)
  applications: Application[];

  @OneToMany(() => ApplicationRun, (run) => run.job)
  applicationRuns: ApplicationRun[];

  @OneToMany(() => JobFilterEntity, (filter) => filter.job)
  filters: JobFilterEntity[];

  @Column({ name: "external_id", type: "text", nullable: false })
  externalId: string;

  @Column({ type: "text", nullable: false, default: "" })
  title: string;

  @Column({ type: "text", nullable: false, default: "" })
  location: string;

  @Column({ type: "text", nullable: false, default: "" })
  url: string;

  @Column({ type: "text", nullable: false, default: "" })
  description: string;

  @Column({ name: "raw_json", type: "text", nullable: false, default: "{}" })
  rawJson: string;

  @Column({ name: "content_hash", type: "text", nullable: false, default: "" })
  contentHash: string;

  @Column({ type: "text", nullable: false, default: "open" })
  status: string;

  @Column({ name: "first_seen_at", type: "text", nullable: false })
  firstSeenAt: string;

  @Column({ name: "last_seen_at", type: "text", nullable: false })
  lastSeenAt: string;

  @Column({ name: "closed_at", type: "text", nullable: true })
  closedAt: string | null;

  @Column({ name: "created_at", type: "text", nullable: false })
  createdAt: string;

  @Column({ name: "updated_at", type: "text", nullable: false })
  updatedAt: string;
}

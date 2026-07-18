import { Entity, PrimaryGeneratedColumn, Column, Index, OneToMany } from "typeorm";
import type { Job } from "./job.entity";

@Entity("companies")
@Index("idx_companies_active_slug", ["active", "slug"])
@Index("idx_companies_active_ats", ["active", "ats"])
@Index("idx_companies_name", ["name"])
export class Company {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToMany("Job", (job: any) => job.company)
  jobs: Job[];

  @Column({ type: "text", nullable: false })
  name: string;

  @Column({ type: "text", unique: true, nullable: false })
  slug: string;

  @Column({ type: "text", nullable: false })
  ats: string;

  @Column({ type: "text", nullable: false })
  endpoint: string;

  @Column({ type: "integer", nullable: false, default: 1 })
  active: number;

  @Column({ name: "discovered_at", type: "text", nullable: false })
  discoveredAt: string;

  @Column({ name: "last_fetched_at", type: "text", nullable: true })
  lastFetchedAt: string | null;

  @Column({ name: "last_successful_fetch_at", type: "text", nullable: true })
  lastSuccessfulFetchAt: string | null;

  @Column({ name: "last_error_at", type: "text", nullable: true })
  lastErrorAt: string | null;

  @Column({ name: "last_error", type: "text", nullable: true })
  lastError: string | null;

  @Column({ name: "created_at", type: "text", nullable: false })
  createdAt: string;

  @Column({ name: "updated_at", type: "text", nullable: false })
  updatedAt: string;
}

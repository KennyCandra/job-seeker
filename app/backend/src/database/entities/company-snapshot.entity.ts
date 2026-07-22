import { Entity, PrimaryGeneratedColumn, Column, Index, Unique } from "typeorm";

/**
 * One row per company per day: the time-series backbone for hiring trends.
 * Written by the daily-pipeline task after each full sync. History cannot be
 * backfilled — rows only accrue from the day this shipped.
 */
@Entity("company_snapshots")
@Unique("uq_company_snapshots_company_date", ["companyId", "snapshotDate"])
@Index("idx_company_snapshots_date", ["snapshotDate"])
export class CompanySnapshot {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id: string;

  @Column({ name: "company_id", type: "integer", nullable: false })
  companyId: number;

  /** ISO date (YYYY-MM-DD, UTC) the snapshot describes. */
  @Column({ name: "snapshot_date", type: "text", nullable: false })
  snapshotDate: string;

  @Column({ name: "open_count", type: "integer", nullable: false, default: 0 })
  openCount: number;

  @Column({ name: "new_count", type: "integer", nullable: false, default: 0 })
  newCount: number;

  @Column({ name: "closed_count", type: "integer", nullable: false, default: 0 })
  closedCount: number;

  @Column({ name: "created_at", type: "text", nullable: false })
  createdAt: string;
}

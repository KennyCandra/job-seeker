import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";

export type CompanySnapshotRecord = {
  id: string;
  companyId: number;
  snapshotDate: string;
  openCount: number;
  newCount: number;
  closedCount: number;
  createdAt: string;
};

// Alias snake_case columns to camelCase; never SELECT *. (See ./index.ts.)
const SNAPSHOT_COLUMNS = `id, company_id AS "companyId", snapshot_date AS "snapshotDate",
  open_count AS "openCount", new_count AS "newCount", closed_count AS "closedCount",
  created_at AS "createdAt"`;

@Injectable()
export class CompanySnapshotsRepository {
  constructor(private readonly dataSource: DataSource) {}

  /**
   * Writes one snapshot row per active company for the given UTC date
   * (YYYY-MM-DD) in a single INSERT…SELECT pass. Idempotent: re-running for
   * the same date overwrites that date's counts with the current state.
   *
   * Timestamps in `jobs` are ISO-8601 UTC text, so LEFT(ts, 10) is the date.
   */
  async upsertForDate(date: string): Promise<number> {
    const now = new Date().toISOString();
    const rows = await this.dataSource.query(
      `INSERT INTO company_snapshots (company_id, snapshot_date, open_count, new_count, closed_count, created_at)
       SELECT c.id, $1,
         COUNT(j.id) FILTER (WHERE j.status = 'open')::int,
         COUNT(j.id) FILTER (WHERE LEFT(j.first_seen_at, 10) = $1)::int,
         COUNT(j.id) FILTER (WHERE LEFT(j.closed_at, 10) = $1)::int,
         $2
       FROM companies c
       LEFT JOIN jobs j ON j.company_id = c.id
       WHERE c.active = 1
       GROUP BY c.id
       ON CONFLICT (company_id, snapshot_date) DO UPDATE SET
         open_count = EXCLUDED.open_count,
         new_count = EXCLUDED.new_count,
         closed_count = EXCLUDED.closed_count
       RETURNING id`,
      [date, now],
    );
    return rows.length;
  }

  async getByCompany(companyId: number, limit = 90): Promise<CompanySnapshotRecord[]> {
    const rows = await this.dataSource.query(
      `SELECT ${SNAPSHOT_COLUMNS} FROM company_snapshots WHERE company_id = $1 ORDER BY snapshot_date DESC LIMIT $2`,
      [companyId, limit],
    );
    return rows as CompanySnapshotRecord[];
  }

  async countForDate(date: string): Promise<number> {
    const rows = await this.dataSource.query(
      `SELECT COUNT(*)::int AS c FROM company_snapshots WHERE snapshot_date = $1`,
      [date],
    );
    return Number(rows[0]?.c ?? 0);
  }
}

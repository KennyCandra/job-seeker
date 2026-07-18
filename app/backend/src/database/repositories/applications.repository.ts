import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";

export type SaveApplicationInput = {
  id: string;
  jobId: string;
  status?: string;
  score?: number;
  documents?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type ApplicationRow = {
  id: string;
  jobId: string;
  status: string;
  score: number;
  documents: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class ApplicationsRepository {
  constructor(private readonly dataSource: DataSource) {}

  async create(input: SaveApplicationInput): Promise<void> {
    const now = input.createdAt || new Date().toISOString();
    await this.dataSource.query(
      `INSERT INTO applications (id, job_id, status, score, documents, notes, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $7)
       ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, score = EXCLUDED.score, documents = EXCLUDED.documents, notes = EXCLUDED.notes, updated_at = EXCLUDED.updated_at`,
      [input.id, input.jobId, input.status ?? "ready", input.score ?? 0, input.documents ?? "[]", input.notes ?? "", now],
    );
  }

  async getByJobId(jobId: string): Promise<ApplicationRow | undefined> {
    const rows = await this.dataSource.query(
      `SELECT id, job_id, status, score, documents, notes, created_at, updated_at FROM applications WHERE job_id = $1 LIMIT 1`,
      [jobId],
    );
    return rows[0] ? toApplicationRow(rows[0]) : undefined;
  }

  async getAll(): Promise<ApplicationRow[]> {
    const rows = await this.dataSource.query(
      `SELECT id, job_id, status, score, documents, notes, created_at, updated_at FROM applications ORDER BY created_at DESC`,
    );
    return rows.map(toApplicationRow);
  }

  async updateStatus(jobId: string, status: string): Promise<void> {
    await this.dataSource.query(`UPDATE applications SET status = $1, updated_at = $2 WHERE job_id = $3`, [
      status,
      new Date().toISOString(),
      jobId,
    ]);
  }

  async saveAcceptedJob(jobId: string, score: number, status: string): Promise<void> {
    const id = `app-${jobId}-${Date.now().toString(36)}`;
    await this.create({ id, jobId, status, score });
  }

  async getProcessedJobIdsFor(jobIds: string[]): Promise<string[]> {
    if (jobIds.length === 0) return [];
    const placeholders = jobIds.map((_, i) => `$${i + 1}`).join(", ");
    const rows = await this.dataSource.query(
      `SELECT DISTINCT job_id FROM applications WHERE job_id IN (${placeholders}) AND status != 'ready'`,
      jobIds,
    );
    return rows.map((r: any) => r.job_id);
  }

  async delete(jobId: string): Promise<void> {
    await this.dataSource.query(`DELETE FROM applications WHERE job_id = $1`, [jobId]);
  }

  async listCursor(cursorId?: string, limit = 25): Promise<{ items: ApplicationRow[]; nextCursor: string | null }> {
    const page = Math.max(1, Math.min(100, limit));
    let cursorRow: { createdAt: string; id: string } | undefined;
    if (cursorId) {
      const rows = await this.dataSource.query(
        `SELECT id, created_at AS "createdAt" FROM applications WHERE id = $1 LIMIT 1`,
        [cursorId],
      );
      cursorRow = rows[0];
    }
    const where = cursorRow
      ? `(a.created_at < $1 OR (a.created_at = $1 AND a.id < $2))`
      : "";
    const params: any[] = cursorRow ? [cursorRow.createdAt, cursorRow.id] : [];
    const rows = await this.dataSource.query(
      `SELECT a.id, a.job_id AS "jobId", a.score, a.status, a.documents, a.notes, a.created_at AS "createdAt", a.updated_at AS "updatedAt",
              c.name AS "company", j.title AS "title", j.location AS "location", c.ats AS "site", j.url AS "url"
       FROM applications a
       INNER JOIN jobs j ON j.id = a.job_id
       INNER JOIN companies c ON c.id = j.company_id
       ${where ? `WHERE ${where}` : ""}
       ORDER BY a.created_at DESC, a.id DESC
       LIMIT $${params.length + 1}`,
      [...params, page + 1],
    );
    const items = rows.slice(0, page).map((r: any) => toApplicationRow(r));
    const last = items[items.length - 1];
    const nextCursor = rows.length > page && last ? last.id : null;
    return { items, nextCursor };
  }
}

function toApplicationRow(row: any): ApplicationRow {
  return {
    id: row.id,
    jobId: row.job_id ?? row.jobId,
    status: row.status,
    score: Number(row.score),
    documents: row.documents,
    notes: row.notes,
    createdAt: row.created_at ?? row.createdAt,
    updatedAt: row.updated_at ?? row.updatedAt,
  };
}

import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";

export type SaveJobDocumentInput = {
  id: string;
  jobId: string;
  type: string;
  status?: string;
  content?: string;
  filePath?: string;
  metadata?: unknown;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type JobDocumentRow = {
  id: string;
  jobId: string;
  type: string;
  status: string;
  content: string;
  filePath: string;
  metadata: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class JobDocumentsRepository {
  constructor(private readonly dataSource: DataSource) {}

  async save(input: SaveJobDocumentInput): Promise<void> {
    const now = input.createdAt || new Date().toISOString();
    await this.dataSource.query(
      `INSERT INTO job_documents (id, job_id, type, status, content, file_path, metadata, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)
       ON CONFLICT (id) DO UPDATE SET type = EXCLUDED.type, status = EXCLUDED.status, content = EXCLUDED.content, file_path = EXCLUDED.file_path, metadata = EXCLUDED.metadata, updated_at = EXCLUDED.updated_at`,
      [
        input.id,
        input.jobId,
        input.type,
        input.status ?? "ready",
        input.content ?? "",
        input.filePath ?? "",
        JSON.stringify(input.metadata ?? {}),
        input.createdBy ?? "system",
        now,
      ],
    );
  }

  async getById(id: string): Promise<JobDocumentRow | undefined> {
    const rows = await this.dataSource.query(
      `SELECT id, job_id, type, status, content, file_path, metadata, created_by, created_at, updated_at FROM job_documents WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows[0]
      ? { ...(rows[0] as any), jobId: rows[0].job_id, filePath: rows[0].file_path, createdBy: rows[0].created_by }
      : undefined;
  }

  async getByJobId(jobId: string): Promise<JobDocumentRow[]> {
    const rows = await this.dataSource.query(
      `SELECT id, job_id, type, status, content, file_path, metadata, created_by, created_at, updated_at FROM job_documents WHERE job_id = $1 ORDER BY created_at DESC, id ASC`,
      [jobId],
    );
    return rows.map((r: any) => ({
      id: r.id,
      jobId: r.job_id,
      type: r.type,
      status: r.status,
      content: r.content,
      filePath: r.file_path,
      metadata: r.metadata,
      createdBy: r.created_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }
}

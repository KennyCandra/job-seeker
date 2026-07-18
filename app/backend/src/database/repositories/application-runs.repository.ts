import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";

export type SaveApplicationRunInput = {
  id: string;
  jobId: string;
  status?: string;
  profilePath?: string;
  outputDir?: string;
  currentUrl?: string;
  error?: string | null;
  summary?: unknown;
  createdAt?: string;
  updatedAt?: string;
};

export type ApplicationRunPatch = {
  currentUrl?: string;
  outputDir?: string;
  error?: string | null;
  summary?: unknown;
};

export type ApplicationRunRow = {
  id: string;
  jobId: string;
  status: string;
  profilePath: string;
  outputDir: string;
  currentUrl: string;
  error: string | null;
  summary: string;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class ApplicationRunsRepository {
  constructor(private readonly dataSource: DataSource) {}

  async create(input: SaveApplicationRunInput): Promise<void> {
    const now = input.createdAt || new Date().toISOString();
    await this.dataSource.query(
      `INSERT INTO application_runs (id, job_id, status, profile_path, output_dir, current_url, error, summary, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9)`,
      [
        input.id,
        input.jobId,
        input.status ?? "running",
        input.profilePath ?? "",
        input.outputDir ?? "",
        input.currentUrl ?? "",
        input.error ?? null,
        JSON.stringify(input.summary ?? {}),
        now,
      ],
    );
  }

  async getById(runId: string): Promise<ApplicationRunRow | null> {
    const rows = await this.dataSource.query(
      `SELECT id, job_id AS "jobId", status, profile_path AS "profilePath", output_dir AS "outputDir",
              current_url AS "currentUrl", error, summary, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM application_runs WHERE id = $1 LIMIT 1`,
      [runId],
    );
    return rows[0] || null;
  }

  async getLatestByJobId(jobId: string): Promise<ApplicationRunRow | null> {
    const rows = await this.dataSource.query(
      `SELECT id, job_id AS "jobId", status, profile_path AS "profilePath", output_dir AS "outputDir",
              current_url AS "currentUrl", error, summary, created_at AS "createdAt", updated_at AS "updatedAt"
       FROM application_runs WHERE job_id = $1 ORDER BY created_at DESC, id DESC LIMIT 1`,
      [jobId],
    );
    return rows[0] || null;
  }

  async updateStatus(runId: string, status: string, patch: ApplicationRunPatch = {}): Promise<void> {
    const sets: string[] = ["status = $2", "updated_at = $3"];
    const params: unknown[] = [runId, status, new Date().toISOString()];
    let i = 4;
    if (patch.currentUrl !== undefined) {
      sets.push(`current_url = $${i++}`);
      params.push(patch.currentUrl);
    }
    if (patch.outputDir !== undefined) {
      sets.push(`output_dir = $${i++}`);
      params.push(patch.outputDir);
    }
    if (patch.error !== undefined) {
      sets.push(`error = $${i++}`);
      params.push(patch.error);
    }
    if (patch.summary !== undefined) {
      sets.push(`summary = $${i++}`);
      params.push(JSON.stringify(patch.summary));
    }
    await this.dataSource.query(`UPDATE application_runs SET ${sets.join(", ")} WHERE id = $1`, params);
  }
}

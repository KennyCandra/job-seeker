import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";

export type SaveJobFilterInput = {
  id: string;
  jobId: string;
  contentHash?: string;
  verdict?: string;
  score?: number;
  reasons?: string[];
  mustHaveHits?: string[];
  missingItems?: string[];
  model?: string;
  promptVersion?: string;
  createdAt?: string;
};

export type JobFilterRow = {
  id: string;
  jobId: string;
  contentHash: string;
  verdict: string;
  score: number;
  reasons: string[];
  mustHaveHits: string[];
  missingItems: string[];
  model: string;
  promptVersion: string;
  createdAt: string;
};

function parseArray(value: string | null): string[] {
  if (!value) return [];
  try {
    return JSON.parse(value);
  } catch {
    return [];
  }
}

@Injectable()
export class JobFiltersRepository {
  constructor(private readonly dataSource: DataSource) {}

  async save(input: SaveJobFilterInput): Promise<void> {
    const now = input.createdAt || new Date().toISOString();
    await this.dataSource.query(
      `INSERT INTO job_filters (id, job_id, content_hash, verdict, score, reasons, must_have_hits, missing_items, model, prompt_version, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO UPDATE SET content_hash = EXCLUDED.content_hash, verdict = EXCLUDED.verdict, score = EXCLUDED.score, reasons = EXCLUDED.reasons, must_have_hits = EXCLUDED.must_have_hits, missing_items = EXCLUDED.missing_items, model = EXCLUDED.model, prompt_version = EXCLUDED.prompt_version`,
      [
        input.id,
        input.jobId,
        input.contentHash ?? "",
        input.verdict ?? "reject",
        input.score ?? 0,
        JSON.stringify(input.reasons ?? []),
        JSON.stringify(input.mustHaveHits ?? []),
        JSON.stringify(input.missingItems ?? []),
        input.model ?? "",
        input.promptVersion ?? "",
        now,
      ],
    );
  }

  async getByJobId(jobId: string): Promise<JobFilterRow[]> {
    const rows = await this.dataSource.query(
      `SELECT id, job_id, content_hash, verdict, score, reasons, must_have_hits, missing_items, model, prompt_version, created_at FROM job_filters WHERE job_id = $1 ORDER BY created_at DESC, id ASC`,
      [jobId],
    );
    return rows.map((r: any) => ({
      id: r.id,
      jobId: r.job_id,
      contentHash: r.content_hash,
      verdict: r.verdict,
      score: Number(r.score),
      reasons: parseArray(r.reasons),
      mustHaveHits: parseArray(r.must_have_hits),
      missingItems: parseArray(r.missing_items),
      model: r.model,
      promptVersion: r.prompt_version,
      createdAt: r.created_at,
    }));
  }
}

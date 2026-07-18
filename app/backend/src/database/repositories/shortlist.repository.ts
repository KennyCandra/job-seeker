import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";

export type ShortlistItem = {
  jobId: string;
  company: string;
  companySlug: string;
  title: string;
  location: string;
  score: number;
  verdict: "accept" | "reject";
  reasons: string[];
  mustHaveHits: string[];
  missingItems: string[];
  applyUrl: string;
  filteredAt: string;
};

function parseArray(value: string | null): string[] {
  if (!value) return [];
  try { return JSON.parse(value); } catch { return []; }
}

@Injectable()
export class ShortlistRepository {
  constructor(private readonly dataSource: DataSource) {}

  async getAll(): Promise<ShortlistItem[]> {
    const rows = await this.dataSource.query(`
      SELECT
        j.id AS "jobId",
        c.name AS "company",
        c.slug AS "companySlug",
        j.title AS "title",
        j.location AS "location",
        lf.score AS "score",
        lf.verdict AS "verdict",
        lf.reasons AS "reasons",
        lf.must_have_hits AS "mustHaveHits",
        lf.missing_items AS "missingItems",
        j.url AS "applyUrl",
        lf.created_at AS "filteredAt"
      FROM (
        SELECT DISTINCT ON (job_id) *
        FROM job_filters
        ORDER BY job_id, created_at DESC, id ASC
      ) lf
      INNER JOIN jobs j ON lf.job_id = j.id
      INNER JOIN companies c ON j.company_id = c.id
      ORDER BY lf.score DESC, lf.created_at DESC
    `);
    return rows.map(toItem);
  }

  async delete(jobId: string): Promise<void> {
    await this.dataSource.query(`DELETE FROM job_filters WHERE job_id = $1`, [jobId]);
  }
}

function toItem(r: any): ShortlistItem {
  return {
    jobId: r.jobId,
    company: r.company,
    companySlug: r.companySlug,
    title: r.title,
    location: r.location,
    score: Number(r.score),
    verdict: r.verdict as "accept" | "reject",
    reasons: parseArray(r.reasons),
    mustHaveHits: parseArray(r.mustHaveHits),
    missingItems: parseArray(r.missingItems),
    applyUrl: r.applyUrl,
    filteredAt: r.filteredAt,
  };
}

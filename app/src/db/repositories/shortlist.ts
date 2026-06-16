import { eq } from "drizzle-orm";
import { getSql } from "../connection";
import { Repository } from "../repository";
import { jobFilters } from "../schema";
import type { ShortlistItem } from "../../shared/types";

export class ShortlistRepository extends Repository {
  async getAll(): Promise<ShortlistItem[]> {
    const rows = await getSql().unsafe(`
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

  async getByJobId(jobId: string): Promise<ShortlistItem | undefined> {
    const [r] = await getSql().unsafe(`
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
      FROM job_filters lf
      INNER JOIN jobs j ON lf.job_id = j.id
      INNER JOIN companies c ON j.company_id = c.id
      WHERE lf.job_id = $1
      ORDER BY lf.created_at DESC, lf.id ASC
      LIMIT 1
    `, [jobId]);
    return r ? toItem(r) : undefined;
  }

  async getAccepted(): Promise<ShortlistItem[]> {
    return (await this.getAll()).filter((item) => item.verdict === "accept");
  }

  async save(items: ShortlistItem[]): Promise<void> {
    for (const item of items) await this.upsert(item);
  }

  async upsert(item: ShortlistItem): Promise<void> {
    const now = item.filteredAt || this.now();
    await this.db.insert(jobFilters)
      .values({
        id: `filter-${item.jobId}-${Date.now()}`,
        jobId: item.jobId,
        contentHash: "",
        verdict: item.verdict,
        score: item.score,
        reasons: JSON.stringify(item.reasons),
        mustHaveHits: JSON.stringify(item.mustHaveHits),
        missingItems: JSON.stringify(item.missingItems),
        createdAt: now,
      });
  }

  async delete(jobId: string): Promise<void> {
    await this.db.delete(jobFilters).where(eq(jobFilters.jobId, jobId));
  }

  async clear(): Promise<void> {
    await this.db.delete(jobFilters);
  }
}

function toItem(r: any): ShortlistItem {
  return {
    jobId: r.jobId,
    company: r.company,
    companySlug: r.companySlug,
    title: r.title,
    location: r.location,
    score: r.score,
    verdict: r.verdict as "accept" | "reject",
    reasons: JSON.parse(r.reasons || "[]"),
    mustHaveHits: JSON.parse(r.mustHaveHits || "[]"),
    missingItems: JSON.parse(r.missingItems || "[]"),
    applyUrl: r.applyUrl,
    filteredAt: r.filteredAt,
  };
}

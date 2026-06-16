import { eq, desc, inArray } from "drizzle-orm";
import { Repository } from "../repository";
import { companies, jobFilters, jobs } from "../schema";
import type { ShortlistItem } from "../../shared/types";

export class ShortlistRepository extends Repository {
  getAll(): ShortlistItem[] {
    const latest = this.latestFilterIds();
    if (latest.length === 0) return [];
    const rows = this.queryRows()
      .where(inArray(jobFilters.id, latest))
      .orderBy(desc(jobFilters.score), desc(jobFilters.createdAt))
      .all();
    return rows.map(toItem);
  }

  getByJobId(jobId: string): ShortlistItem | undefined {
    const latest = this.latestFilterIdForJob(jobId);
    if (!latest) return undefined;
    const r = this.queryRows().where(eq(jobFilters.id, latest)).get();
    return r ? toItem(r) : undefined;
  }

  getAccepted(): ShortlistItem[] {
    return this.getAll().filter((item) => item.verdict === "accept");
  }

  save(items: ShortlistItem[]): void {
    for (const item of items) this.upsert(item);
  }

  upsert(item: ShortlistItem): void {
    const now = item.filteredAt || this.now();
    this.db.insert(jobFilters)
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
      })
      .run();
  }

  delete(jobId: string): void {
    this.db.delete(jobFilters).where(eq(jobFilters.jobId, jobId)).run();
  }

  clear(): void {
    this.db.delete(jobFilters).run();
  }

  private latestFilterIds(): string[] {
    const rows = this.db.select({
      id: jobFilters.id,
      jobId: jobFilters.jobId,
      createdAt: jobFilters.createdAt,
    }).from(jobFilters).orderBy(desc(jobFilters.createdAt)).all();

    const seen = new Set<string>();
    const ids: string[] = [];
    for (const row of rows as Array<{ id: string; jobId: string }>) {
      if (seen.has(row.jobId)) continue;
      seen.add(row.jobId);
      ids.push(row.id);
    }
    return ids;
  }

  private latestFilterIdForJob(jobId: string): string | undefined {
    return (this.db.select({ id: jobFilters.id }).from(jobFilters)
      .where(eq(jobFilters.jobId, jobId))
      .orderBy(desc(jobFilters.createdAt))
      .limit(1)
      .get() as { id: string } | undefined)?.id;
  }

  private queryRows() {
    return this.db.select({
      jobId: jobs.id,
      company: companies.name,
      companySlug: companies.slug,
      title: jobs.title,
      location: jobs.location,
      score: jobFilters.score,
      verdict: jobFilters.verdict,
      reasons: jobFilters.reasons,
      mustHaveHits: jobFilters.mustHaveHits,
      missingItems: jobFilters.missingItems,
      applyUrl: jobs.url,
      filteredAt: jobFilters.createdAt,
    }).from(jobFilters)
      .innerJoin(jobs, eq(jobFilters.jobId, jobs.id))
      .innerJoin(companies, eq(jobs.companyId, companies.id));
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

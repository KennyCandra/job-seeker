import { eq, desc } from "drizzle-orm";
import { Repository } from "../repository";
import { shortlist } from "../schema";
import type { ShortlistItem } from "../../shared/types";

export class ShortlistRepository extends Repository {
  getAll(): ShortlistItem[] {
    const rows = this.db.select().from(shortlist).orderBy(desc(shortlist.score), desc(shortlist.filteredAt)).all();
    return (rows as any[]).map(toItem);
  }

  getByJobId(jobId: string): ShortlistItem | undefined {
    const r = this.db.select().from(shortlist).where(eq(shortlist.jobId, jobId)).get();
    return r ? toItem(r as any) : undefined;
  }

  getAccepted(): ShortlistItem[] {
    const rows = this.db.select().from(shortlist).where(eq(shortlist.verdict, "accept")).orderBy(desc(shortlist.score)).all();
    return (rows as any[]).map(toItem);
  }

  save(items: ShortlistItem[]): void {
    const now = this.now();
    for (const item of items) {
      this.db.insert(shortlist)
        .values({
          jobId: item.jobId,
          company: item.company,
          companySlug: item.companySlug,
          title: item.title,
          location: item.location,
          score: item.score,
          verdict: item.verdict,
          reasons: JSON.stringify(item.reasons),
          mustHaveHits: JSON.stringify(item.mustHaveHits),
          missingItems: JSON.stringify(item.missingItems),
          applyUrl: item.applyUrl,
          filteredAt: now,
        })
        .onConflictDoUpdate({
          target: shortlist.jobId,
          set: {
            company: item.company, companySlug: item.companySlug, title: item.title,
            location: item.location, score: item.score, verdict: item.verdict,
            reasons: JSON.stringify(item.reasons), mustHaveHits: JSON.stringify(item.mustHaveHits),
            missingItems: JSON.stringify(item.missingItems), applyUrl: item.applyUrl, filteredAt: now,
          },
        })
        .run();
    }
  }

  upsert(item: ShortlistItem): void {
    this.save([item]);
  }

  delete(jobId: string): void {
    this.db.delete(shortlist).where(eq(shortlist.jobId, jobId)).run();
  }

  clear(): void {
    this.db.delete(shortlist).run();
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

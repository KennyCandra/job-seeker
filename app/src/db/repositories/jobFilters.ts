import { eq, desc, sql } from "drizzle-orm";
import { Repository } from "../repository";
import { jobFilters } from "../schema";

export type SaveFilterInput = {
  id: string;
  jobId: string;
  contentHash?: string;
  verdict: string;
  score: number;
  reasons: string[];
  mustHaveHits: string[];
  missingItems: string[];
  model?: string;
  promptVersion?: string;
};

export class JobFiltersRepository extends Repository {
  save(input: SaveFilterInput): void {
    const now = new Date().toISOString();
    this.db.insert(jobFilters)
      .values({
        id: input.id,
        jobId: input.jobId,
        contentHash: input.contentHash ?? "",
        verdict: input.verdict,
        score: input.score,
        reasons: JSON.stringify(input.reasons),
        mustHaveHits: JSON.stringify(input.mustHaveHits),
        missingItems: JSON.stringify(input.missingItems),
        model: input.model ?? "",
        promptVersion: input.promptVersion ?? "",
        createdAt: now,
      })
      .run();
  }

  getByJobId(jobId: string): any[] {
    return this.db.select().from(jobFilters)
      .where(eq(jobFilters.jobId, jobId))
      .orderBy(desc(jobFilters.createdAt))
      .all();
  }

  getRecent(limit = 50): any[] {
    return this.db.select().from(jobFilters)
      .orderBy(desc(jobFilters.createdAt))
      .limit(limit)
      .all();
  }
}
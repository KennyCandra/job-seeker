import { eq, and, desc, sql } from "drizzle-orm";
import { Repository } from "../repository";
import { savedJobs } from "../schema";
import type { SavedJob } from "../../shared/types";

export type SaveJobInput = {
  companySlug: string;
  jobId: string;
  url: string;
  title?: string;
  location?: string;
  description?: string;
};

export class SavedJobsRepository extends Repository {
  save(input: SaveJobInput): void {
    const now = this.now();
    this.db.insert(savedJobs)
      .values({
        companySlug: input.companySlug,
        jobId: input.jobId,
        url: input.url,
        title: input.title ?? "",
        location: input.location ?? "",
        description: input.description ?? "",
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [savedJobs.companySlug, savedJobs.jobId],
        set: {
          url: input.url,
          title: input.title ?? "",
          location: input.location ?? "",
          description: input.description ?? "",
          updatedAt: now,
        },
      })
      .run();
  }

  get(companySlug: string, jobId: string): SavedJob | undefined {
    const r = this.db.select().from(savedJobs)
      .where(and(eq(savedJobs.companySlug, companySlug), eq(savedJobs.jobId, jobId)))
      .get();
    return r as SavedJob | undefined;
  }

  getAll(): SavedJob[] {
    return this.db.select().from(savedJobs).orderBy(desc(savedJobs.updatedAt)).all() as SavedJob[];
  }

  getByCompany(companySlug: string): SavedJob[] {
    return this.db.select().from(savedJobs)
      .where(eq(savedJobs.companySlug, companySlug))
      .orderBy(desc(savedJobs.updatedAt)).all() as SavedJob[];
  }

  getAllIds(): Array<{ companySlug: string; jobId: string }> {
    return this.db.select({ companySlug: savedJobs.companySlug, jobId: savedJobs.jobId })
      .from(savedJobs).orderBy(desc(savedJobs.updatedAt)).all() as Array<{ companySlug: string; jobId: string }>;
  }

  delete(companySlug: string, jobId: string): void {
    this.db.delete(savedJobs)
      .where(and(eq(savedJobs.companySlug, companySlug), eq(savedJobs.jobId, jobId)))
      .run();
  }

  count(): number {
    const r = this.db.select({ c: sql<number>`COUNT(*)` }).from(savedJobs).get();
    return r?.c ?? 0;
  }

  countByCompany(companySlug: string): number {
    const r = this.db.select({ c: sql<number>`COUNT(*)` }).from(savedJobs)
      .where(eq(savedJobs.companySlug, companySlug)).get();
    return r?.c ?? 0;
  }
}

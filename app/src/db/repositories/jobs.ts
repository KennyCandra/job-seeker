import { eq, and, desc, sql } from "drizzle-orm";
import { createHash } from "crypto";
import { Repository } from "../repository";
import { companies, jobs } from "../schema";
import { getSql } from "../connection";
import type { JobRow, SavedJob } from "../../shared/types";
import { searchJobsList } from "../queries/jobsList";

export type SaveJobInput = {
  id: string;
  companyId: number;
  externalId: string;
  url: string;
  title?: string;
  location?: string;
  description?: string;
  rawJson?: unknown;
  status?: string;
};

export type JobWithCompany = JobRow & {
  companySlug: string;
  companyName: string;
  ats: string;
};

export type JobSearchInput = {
  page?: number;
  pageSize?: number;
  search?: string;
  companyName?: string;
  status?: string;
  verdict?: string;
  smartVerdict?: string;
  minScore?: number;
  fetchedWithinHours?: number;
};

export type JobSearchItem = {
  id: string;
  companySlug: string;
  companyName: string;
  title: string;
  location: string;
  url: string;
  status: string;
  ats: string;
  score: number | null;
  verdict: string | null;
  smartScore: number | null;
  smartVerdict: string | null;
  hasCv: boolean;
  hasCoverLetter: boolean;
  hasRecommendation: boolean;
  hasApplication: boolean;
  updatedAt: string;
};

export type JobSearchResult = {
  items: JobSearchItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  summary: {
    accepted: number;
    rejected: number;
    unfiltered: number;
    smartAccepted: number;
    smartRejected: number;
    smartUnfiltered: number;
  };
  options: {
    companies: string[];
    statuses: string[];
  };
};

export class JobsRepository extends Repository {
  async save(input: SaveJobInput): Promise<void> {
    const now = this.now();
    const description = input.description ?? "";
    const rawJson = JSON.stringify(input.rawJson ?? {});
    const contentHash = hashJobContent({
      title: input.title ?? "",
      location: input.location ?? "",
      url: input.url,
      description,
      rawJson,
    });

    await this.db.insert(jobs)
      .values({
        id: input.id,
        companyId: input.companyId,
        externalId: input.externalId,
        url: input.url,
        title: input.title ?? "",
        location: input.location ?? "",
        description,
        rawJson,
        contentHash,
        status: input.status ?? "open",
        firstSeenAt: now,
        lastSeenAt: now,
        createdAt: now,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: [jobs.companyId, jobs.externalId],
        set: {
          url: input.url,
          title: input.title ?? "",
          location: input.location ?? "",
          description,
          rawJson,
          contentHash,
          status: input.status ?? "open",
          lastSeenAt: now,
          closedAt: null,
          updatedAt: now,
        },
      });
  }

  async getById(id: string): Promise<JobWithCompany | undefined> {
    const [row] = await this.db.select({
      id: jobs.id,
      companyId: jobs.companyId,
      externalId: jobs.externalId,
      title: jobs.title,
      location: jobs.location,
      url: jobs.url,
      description: jobs.description,
      rawJson: jobs.rawJson,
      contentHash: jobs.contentHash,
      status: jobs.status,
      firstSeenAt: jobs.firstSeenAt,
      lastSeenAt: jobs.lastSeenAt,
      closedAt: jobs.closedAt,
      createdAt: jobs.createdAt,
      updatedAt: jobs.updatedAt,
      companySlug: companies.slug,
      companyName: companies.name,
      ats: companies.ats,
    }).from(jobs).innerJoin(companies, eq(jobs.companyId, companies.id)).where(eq(jobs.id, id)).limit(1);
    return row as JobWithCompany | undefined;
  }

  async get(companySlug: string, externalOrJobId: string): Promise<SavedJob | undefined> {
    const company = await this.db.select().from(companies).where(eq(companies.slug, companySlug)).limit(1).then((rows) => rows[0]);
    if (!company) return undefined;
    const [byExternal] = await this.db.select().from(jobs)
      .where(and(eq(jobs.companyId, company.id), eq(jobs.externalId, externalOrJobId)))
      .limit(1);
    const row = byExternal || (await this.db.select().from(jobs)
      .where(and(eq(jobs.companyId, company.id), eq(jobs.id, externalOrJobId)))
      .limit(1))[0];
    return row ? toSavedJob(row as JobRow, company as any) : undefined;
  }

  async getAll(limit: number | null = 100): Promise<SavedJob[]> {
    const query = this.db.select({
      id: jobs.id,
      companyId: jobs.companyId,
      externalId: jobs.externalId,
      title: jobs.title,
      location: jobs.location,
      url: jobs.url,
      description: jobs.description,
      rawJson: jobs.rawJson,
      contentHash: jobs.contentHash,
      status: jobs.status,
      firstSeenAt: jobs.firstSeenAt,
      lastSeenAt: jobs.lastSeenAt,
      closedAt: jobs.closedAt,
      createdAt: jobs.createdAt,
      updatedAt: jobs.updatedAt,
      companySlug: companies.slug,
      companyName: companies.name,
      ats: companies.ats,
    }).from(jobs).innerJoin(companies, eq(jobs.companyId, companies.id)).orderBy(desc(jobs.updatedAt));
    const rows = limit === null ? await query : await query.limit(limit);
    return rows.map((r: any) => toSavedJob(r, { slug: r.companySlug, name: r.companyName, ats: r.ats }));
  }

  async search(input: JobSearchInput = {}): Promise<JobSearchResult> {
    return searchJobsList(getSql(), input);
  }

  async getByCompany(companySlug: string, limit: number | null = 100): Promise<SavedJob[]> {
    const [company] = await this.db.select().from(companies).where(eq(companies.slug, companySlug)).limit(1);
    if (!company) return [];
    const query = this.db.select().from(jobs)
      .where(eq(jobs.companyId, company.id))
      .orderBy(desc(jobs.updatedAt));
    const rows = limit === null ? await query : await query.limit(limit);
    return rows.map((r: any) => toSavedJob(r, company as any));
  }

  async delete(companySlug: string, externalOrJobId: string): Promise<void> {
    const [company] = await this.db.select().from(companies).where(eq(companies.slug, companySlug)).limit(1);
    if (!company) return;
    await this.db.delete(jobs)
      .where(and(eq(jobs.companyId, company.id), eq(jobs.externalId, externalOrJobId)));
  }

  async count(): Promise<number> {
    const [r] = await this.db.select({ c: sql<number>`COUNT(*)` }).from(jobs);
    return Number(r?.c ?? 0);
  }

  async countByCompany(companySlug: string): Promise<number> {
    const [company] = await this.db.select().from(companies).where(eq(companies.slug, companySlug)).limit(1);
    if (!company) return 0;
    const [r] = await this.db.select({ c: sql<number>`COUNT(*)` }).from(jobs)
      .where(eq(jobs.companyId, company.id));
    return Number(r?.c ?? 0);
  }

  async getByCompanyId(companyId: number): Promise<JobRow[]> {
    return this.db.select().from(jobs).where(eq(jobs.companyId, companyId)) as Promise<JobRow[]>;
  }

  async updateLastSeen(jobId: string, lastSeenAt: string): Promise<void> {
    await this.db.update(jobs).set({ lastSeenAt, updatedAt: lastSeenAt }).where(eq(jobs.id, jobId));
  }

  async markClosedMissing(companyId: number, seenExternalIds: string[]): Promise<void> {
    const openJobs = await this.db.select({ id: jobs.id, externalId: jobs.externalId }).from(jobs)
      .where(and(eq(jobs.companyId, companyId), eq(jobs.status, "open"))) as { id: string; externalId: string }[];
    const toClose = openJobs.filter((j) => !seenExternalIds.includes(j.externalId)).map((j) => j.id);
    if (toClose.length > 0) {
      const now = this.now();
      for (const id of toClose) {
        await this.db.update(jobs).set({ status: "closed", closedAt: now, updatedAt: now }).where(eq(jobs.id, id));
      }
    }
  }

  computeContentHash(input: { title: string; location: string; url: string; description: string; rawJson: string }): string {
    return hashJobContent(input);
  }
}

function toSavedJob(row: any, company: { slug: string; name?: string; ats?: string }): SavedJob {
  return {
    id: row.id,
    companyId: row.companyId,
    companySlug: company.slug,
    companyName: company.name || company.slug,
    ats: company.ats || row.ats || "",
    jobId: row.id,
    externalId: row.externalId,
    url: row.url,
    title: row.title,
    location: row.location,
    description: row.description,
    rawJson: row.rawJson,
    contentHash: row.contentHash,
    status: row.status,
    firstSeenAt: row.firstSeenAt,
    lastSeenAt: row.lastSeenAt,
    closedAt: row.closedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function hashJobContent(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

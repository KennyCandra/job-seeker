import { eq, and, desc, sql } from "drizzle-orm";
import { createHash } from "crypto";
import { Repository } from "../repository";
import { companies, jobs } from "../schema";
import type { JobRow, SavedJob } from "../../shared/types";

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
  minScore?: number;
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
  };
  options: {
    companies: string[];
    statuses: string[];
  };
};

export class JobsRepository extends Repository {
  save(input: SaveJobInput): void {
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

    this.db.insert(jobs)
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
      })
      .run();
  }

  getById(id: string): JobWithCompany | undefined {
    const row = this.db.select({
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
    }).from(jobs).innerJoin(companies, eq(jobs.companyId, companies.id)).where(eq(jobs.id, id)).get();
    return row as JobWithCompany | undefined;
  }

  get(companySlug: string, externalOrJobId: string): SavedJob | undefined {
    const company = this.db.select().from(companies).where(eq(companies.slug, companySlug)).get();
    if (!company) return undefined;
    const row = this.db.select().from(jobs)
      .where(and(eq(jobs.companyId, company.id), eq(jobs.externalId, externalOrJobId)))
      .get()
      || this.db.select().from(jobs)
        .where(and(eq(jobs.companyId, company.id), eq(jobs.id, externalOrJobId)))
        .get();
    return row ? toSavedJob(row as JobRow, company as any) : undefined;
  }

  getAll(): SavedJob[] {
    const rows = this.db.select({
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
    }).from(jobs).innerJoin(companies, eq(jobs.companyId, companies.id)).orderBy(desc(jobs.updatedAt)).all();
    return rows.map((r: any) => toSavedJob(r, { slug: r.companySlug, name: r.companyName, ats: r.ats }));
  }

  search(input: JobSearchInput = {}): JobSearchResult {
    const raw = (this.db as any).$client || (this.db as any).session?.client;
    if (!raw) throw new Error("Raw SQLite connection unavailable");

    const requestedPage = Math.max(1, Math.floor(Number(input.page) || 1));
    const pageSize = Math.min(200, Math.max(10, Math.floor(Number(input.pageSize) || 50)));
    const where: string[] = [];
    const params: Array<string | number> = [];

    const search = input.search?.trim();
    if (search) {
      where.push("(LOWER(j.title) LIKE ? OR LOWER(c.name) LIKE ? OR LOWER(j.location) LIKE ?)");
      const like = `%${search.toLowerCase()}%`;
      params.push(like, like, like);
    }

    if (input.companyName) {
      where.push("c.name = ?");
      params.push(input.companyName);
    }

    if (input.status) {
      where.push("j.status = ?");
      params.push(input.status);
    }

    const minScore = Number(input.minScore) || 0;
    if (minScore > 0) {
      where.push("lf.score >= ?");
      params.push(minScore);
    }

    if (input.verdict === "unfiltered") {
      where.push("lf.verdict IS NULL");
    } else if (input.verdict) {
      where.push("lf.verdict = ?");
      params.push(input.verdict);
    }

    const buildBaseSql = (whereSql: string) => `
      FROM jobs j
      INNER JOIN companies c ON c.id = j.company_id
      LEFT JOIN (
        SELECT jf.*
        FROM job_filters jf
        INNER JOIN (
          SELECT job_id, MAX(created_at) AS created_at
          FROM job_filters
          GROUP BY job_id
        ) latest ON latest.job_id = jf.job_id AND latest.created_at = jf.created_at
      ) lf ON lf.job_id = j.id
      ${whereSql}
    `;
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const baseSql = buildBaseSql(whereSql);

    const total = Number(raw.query(`SELECT COUNT(*) AS count ${baseSql}`).get(...params)?.count || 0);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(requestedPage, totalPages);
    const offset = (page - 1) * pageSize;
    const rows = raw.query(`
      SELECT
        j.id,
        c.slug AS companySlug,
        c.name AS companyName,
        j.title,
        j.location,
        j.url,
        j.status,
        c.ats,
        lf.score,
        lf.verdict,
        EXISTS(SELECT 1 FROM job_documents d WHERE d.job_id = j.id AND d.type = 'cv') AS hasCv,
        EXISTS(SELECT 1 FROM job_documents d WHERE d.job_id = j.id AND d.type = 'cover_letter') AS hasCoverLetter,
        EXISTS(SELECT 1 FROM job_documents d WHERE d.job_id = j.id AND d.type = 'recommendation') AS hasRecommendation,
        EXISTS(SELECT 1 FROM applications a WHERE a.job_id = j.id) AS hasApplication,
        j.updated_at AS updatedAt
      ${baseSql}
      ORDER BY j.updated_at DESC, j.id ASC
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset) as any[];

    const summaryWhere = where.filter((clause) => clause !== "lf.verdict IS NULL" && clause !== "lf.verdict = ?");
    const summaryParams = [...params];
    if (input.verdict && input.verdict !== "unfiltered") summaryParams.pop();
    const summaryWhereSql = summaryWhere.length ? `WHERE ${summaryWhere.join(" AND ")}` : "";
    const summaryBaseSql = buildBaseSql(summaryWhereSql);
    const summaryRows = raw.query(`
      SELECT COALESCE(lf.verdict, 'unfiltered') AS verdict, COUNT(*) AS count
      ${summaryBaseSql}
      GROUP BY COALESCE(lf.verdict, 'unfiltered')
    `).all(...summaryParams) as Array<{ verdict: string; count: number }>;

    const companiesRows = raw.query(`
      SELECT DISTINCT c.name AS name
      FROM jobs j
      INNER JOIN companies c ON c.id = j.company_id
      ORDER BY c.name ASC
    `).all() as Array<{ name: string }>;

    const statusRows = raw.query(`
      SELECT DISTINCT status
      FROM jobs
      ORDER BY status ASC
    `).all() as Array<{ status: string }>;

    return {
      items: rows.map((row) => ({
        id: row.id,
        companySlug: row.companySlug,
        companyName: row.companyName,
        title: row.title,
        location: row.location,
        url: row.url,
        status: row.status,
        ats: row.ats,
        score: row.score === null || row.score === undefined ? null : Number(row.score),
        verdict: row.verdict ?? null,
        hasCv: Boolean(row.hasCv),
        hasCoverLetter: Boolean(row.hasCoverLetter),
        hasRecommendation: Boolean(row.hasRecommendation),
        hasApplication: Boolean(row.hasApplication),
        updatedAt: row.updatedAt,
      })),
      total,
      page,
      pageSize,
      totalPages,
      summary: {
        accepted: Number(summaryRows.find((row) => row.verdict === "accept")?.count || 0),
        rejected: Number(summaryRows.find((row) => row.verdict === "reject")?.count || 0),
        unfiltered: Number(summaryRows.find((row) => row.verdict === "unfiltered")?.count || 0),
      },
      options: {
        companies: companiesRows.map((row) => row.name),
        statuses: statusRows.map((row) => row.status),
      },
    };
  }

  getByCompany(companySlug: string): SavedJob[] {
    const company = this.db.select().from(companies).where(eq(companies.slug, companySlug)).get();
    if (!company) return [];
    return this.db.select().from(jobs)
      .where(eq(jobs.companyId, company.id))
      .orderBy(desc(jobs.updatedAt)).all()
      .map((r: any) => toSavedJob(r, company as any));
  }

  delete(companySlug: string, externalOrJobId: string): void {
    const company = this.db.select().from(companies).where(eq(companies.slug, companySlug)).get();
    if (!company) return;
    this.db.delete(jobs)
      .where(and(eq(jobs.companyId, company.id), eq(jobs.externalId, externalOrJobId)))
      .run();
  }

  count(): number {
    const r = this.db.select({ c: sql<number>`COUNT(*)` }).from(jobs).get();
    return r?.c ?? 0;
  }

  countByCompany(companySlug: string): number {
    const company = this.db.select().from(companies).where(eq(companies.slug, companySlug)).get();
    if (!company) return 0;
    const r = this.db.select({ c: sql<number>`COUNT(*)` }).from(jobs)
      .where(eq(jobs.companyId, company.id)).get();
    return r?.c ?? 0;
  }

  getByCompanyId(companyId: number): JobRow[] {
    return this.db.select().from(jobs).where(eq(jobs.companyId, companyId)).all() as JobRow[];
  }

  updateLastSeen(jobId: string, lastSeenAt: string): void {
    this.db.update(jobs).set({ lastSeenAt, updatedAt: lastSeenAt }).where(eq(jobs.id, jobId)).run();
  }

  markClosedMissing(companyId: number, seenExternalIds: string[]): void {
    const openJobs = this.db.select({ id: jobs.id, externalId: jobs.externalId }).from(jobs)
      .where(and(eq(jobs.companyId, companyId), eq(jobs.status, "open"))).all() as { id: string; externalId: string }[];
    const toClose = openJobs.filter((j) => !seenExternalIds.includes(j.externalId)).map((j) => j.id);
    if (toClose.length > 0) {
      const now = this.now();
      for (const id of toClose) {
        this.db.update(jobs).set({ status: "closed", closedAt: now, updatedAt: now }).where(eq(jobs.id, id)).run();
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

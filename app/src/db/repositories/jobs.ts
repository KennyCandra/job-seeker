import { eq, and, desc, sql } from "drizzle-orm";
import { createHash } from "crypto";
import { Repository } from "../repository";
import { companies, jobs } from "../schema";
import { getSql } from "../connection";
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

  async getAll(): Promise<SavedJob[]> {
    const rows = await this.db.select({
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
    return rows.map((r: any) => toSavedJob(r, { slug: r.companySlug, name: r.companyName, ats: r.ats }));
  }

  async search(input: JobSearchInput = {}): Promise<JobSearchResult> {
    const pg = getSql();
    const requestedPage = Math.max(1, Math.floor(Number(input.page) || 1));
    const pageSize = Math.min(200, Math.max(10, Math.floor(Number(input.pageSize) || 50)));
    const where: string[] = [];
    const params: Array<string | number> = [];

    const addParam = (value: string | number): string => {
      params.push(value);
      return `$${params.length}`;
    };

    const search = input.search?.trim();
    if (search) {
      const like = `%${search.toLowerCase()}%`;
      const p1 = addParam(like);
      const p2 = addParam(like);
      const p3 = addParam(like);
      where.push(`(LOWER(j.title) LIKE ${p1} OR LOWER(c.name) LIKE ${p2} OR LOWER(j.location) LIKE ${p3})`);
    }

    if (input.companyName) where.push(`c.name = ${addParam(input.companyName)}`);
    if (input.status) where.push(`j.status = ${addParam(input.status)}`);

    const minScore = Number(input.minScore) || 0;
    if (minScore > 0) where.push(`lf.score >= ${addParam(minScore)}`);

    if (input.verdict === "unfiltered") {
      where.push("lf.verdict IS NULL");
    } else if (input.verdict) {
      where.push(`lf.verdict = ${addParam(input.verdict)}`);
    }

    const buildBaseSql = (whereSql: string) => `
      FROM jobs j
      INNER JOIN companies c ON c.id = j.company_id
      LEFT JOIN (
        SELECT DISTINCT ON (jf.job_id) jf.*
        FROM job_filters jf
        ORDER BY jf.job_id, jf.created_at DESC, jf.id ASC
      ) lf ON lf.job_id = j.id
      ${whereSql}
    `;
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const baseSql = buildBaseSql(whereSql);

    const totalRows = await pg.unsafe(`SELECT COUNT(*)::int AS count ${baseSql}`, params);
    const total = Number(totalRows[0]?.count || 0);
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(requestedPage, totalPages);
    const offset = (page - 1) * pageSize;

    const pageParams = [...params, pageSize, offset];
    const rows = await pg.unsafe(`
      SELECT
        j.id,
        c.slug AS "companySlug",
        c.name AS "companyName",
        j.title,
        j.location,
        j.url,
        j.status,
        c.ats,
        lf.score,
        lf.verdict,
        EXISTS(SELECT 1 FROM job_documents d WHERE d.job_id = j.id AND d.type = 'cv') AS "hasCv",
        EXISTS(SELECT 1 FROM job_documents d WHERE d.job_id = j.id AND d.type = 'cover_letter') AS "hasCoverLetter",
        EXISTS(SELECT 1 FROM job_documents d WHERE d.job_id = j.id AND d.type = 'recommendation') AS "hasRecommendation",
        EXISTS(SELECT 1 FROM applications a WHERE a.job_id = j.id) AS "hasApplication",
        j.updated_at AS "updatedAt"
      ${baseSql}
      ORDER BY j.updated_at DESC, j.id ASC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, pageParams) as any[];

    const summaryWhere = where.filter((clause) => clause !== "lf.verdict IS NULL" && !clause.startsWith("lf.verdict = "));
    const summaryParams = params.slice(0, input.verdict && input.verdict !== "unfiltered" ? -1 : undefined);
    const summaryWhereSql = summaryWhere.length ? `WHERE ${summaryWhere.join(" AND ")}` : "";
    const summaryBaseSql = buildBaseSql(summaryWhereSql);
    const summaryRows = await pg.unsafe(`
      SELECT COALESCE(lf.verdict, 'unfiltered') AS verdict, COUNT(*)::int AS count
      ${summaryBaseSql}
      GROUP BY COALESCE(lf.verdict, 'unfiltered')
    `, summaryParams) as Array<{ verdict: string; count: number }>;

    const companiesRows = await pg.unsafe(`
      SELECT DISTINCT c.name AS name
      FROM jobs j
      INNER JOIN companies c ON c.id = j.company_id
      ORDER BY c.name ASC
    `) as Array<{ name: string }>;

    const statusRows = await pg.unsafe(`
      SELECT DISTINCT status
      FROM jobs
      ORDER BY status ASC
    `) as Array<{ status: string }>;

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

  async getByCompany(companySlug: string): Promise<SavedJob[]> {
    const [company] = await this.db.select().from(companies).where(eq(companies.slug, companySlug)).limit(1);
    if (!company) return [];
    const rows = await this.db.select().from(jobs)
      .where(eq(jobs.companyId, company.id))
      .orderBy(desc(jobs.updatedAt));
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

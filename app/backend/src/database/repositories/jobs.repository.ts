import { Injectable } from "@nestjs/common";
import { DataSource, type EntityManager } from "typeorm";
import { createHash } from "crypto";
import type { AtsPlatform, JobRow, SavedJob } from "../../shared/types";
import { searchJobsList } from "../queries/jobs-list.query";
import { getJobDetail } from "../queries/job-detail.query";

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
  options: { companies: string[]; statuses: string[] };
};

@Injectable()
export class JobsRepository {
  constructor(private readonly dataSource: DataSource) {}

  async save(input: SaveJobInput, manager?: EntityManager): Promise<void> {
    const now = new Date().toISOString();
    const description = input.description ?? "";
    const rawJson = JSON.stringify(input.rawJson ?? {});
    const contentHash = computeContentHash({
      title: input.title ?? "",
      location: input.location ?? "",
      url: input.url,
      description,
      rawJson,
    });

    const q = manager ?? this.dataSource;
    await q.query(
      `INSERT INTO jobs (id, company_id, external_id, url, title, location, description, raw_json, content_hash, status, first_seen_at, last_seen_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11, $11, $11)
       ON CONFLICT (company_id, external_id) DO UPDATE SET
         url = EXCLUDED.url, title = EXCLUDED.title, location = EXCLUDED.location, description = EXCLUDED.description,
         raw_json = EXCLUDED.raw_json, content_hash = EXCLUDED.content_hash, status = EXCLUDED.status,
         last_seen_at = EXCLUDED.last_seen_at, closed_at = NULL, updated_at = EXCLUDED.updated_at`,
      [
        input.id,
        input.companyId,
        input.externalId,
        input.url,
        input.title ?? "",
        input.location ?? "",
        description,
        rawJson,
        contentHash,
        input.status ?? "open",
        now,
      ],
    );
  }

  async getById(id: string): Promise<JobWithCompany | undefined> {
    const rows = await this.dataSource.query(
      `SELECT j.id, j.company_id, j.external_id, j.title, j.location, j.url, j.description, j.raw_json, j.content_hash, j.status, j.first_seen_at, j.last_seen_at, j.closed_at, j.created_at, j.updated_at, c.slug AS company_slug, c.name AS company_name, c.ats
       FROM jobs j INNER JOIN companies c ON c.id = j.company_id WHERE j.id = $1 LIMIT 1`,
      [id],
    );
    const row = rows[0];
    if (!row) return undefined;
    return {
      ...toJobRow(row),
      companySlug: row.company_slug,
      companyName: row.company_name,
      ats: row.ats,
    };
  }

  async get(companySlug: string, externalOrJobId: string): Promise<SavedJob | undefined> {
    const company = await this.dataSource.query(`SELECT id, slug, name, ats FROM companies WHERE slug = $1 LIMIT 1`, [companySlug]);
    if (!company[0]) return undefined;
    const byExternal = await this.dataSource.query(
      `SELECT j.* FROM jobs j WHERE j.company_id = $1 AND j.external_id = $2 LIMIT 1`,
      [company[0].id, externalOrJobId],
    );
    const row = byExternal[0] || (await this.dataSource.query(`SELECT j.* FROM jobs j WHERE j.company_id = $1 AND j.id = $2 LIMIT 1`, [company[0].id, externalOrJobId]))[0];
    return row ? toSavedJob(row, company[0]) : undefined;
  }

  async getAll(limit: number | null = 100): Promise<SavedJob[]> {
    const sql = `SELECT j.id, j.company_id, j.external_id, j.title, j.location, j.url, j.description, j.raw_json, j.content_hash, j.status, j.first_seen_at, j.last_seen_at, j.closed_at, j.created_at, j.updated_at, c.slug AS company_slug, c.name AS company_name, c.ats
      FROM jobs j INNER JOIN companies c ON c.id = j.company_id ORDER BY j.updated_at DESC${limit === null ? "" : " LIMIT " + Math.floor(limit)}`;
    const rows = await this.dataSource.query(sql);
    return rows.map((r: any) => toSavedJob(r, { slug: r.company_slug, name: r.company_name, ats: r.ats }));
  }

  async search(input: JobSearchInput = {}): Promise<JobSearchResult> {
    return searchJobsList(this.dataSource, input);
  }

  async getByCompany(companySlug: string, limit: number | null = 100): Promise<SavedJob[]> {
    const company = await this.dataSource.query(`SELECT id, slug, name, ats FROM companies WHERE slug = $1 LIMIT 1`, [companySlug]);
    if (!company[0]) return [];
    const sql = `SELECT j.id, j.company_id, j.external_id, j.title, j.location, j.url, j.description, j.raw_json, j.content_hash, j.status, j.first_seen_at, j.last_seen_at, j.closed_at, j.created_at, j.updated_at, c.slug AS company_slug, c.name AS company_name, c.ats
      FROM jobs j INNER JOIN companies c ON c.id = j.company_id WHERE j.company_id = $1 ORDER BY j.updated_at DESC${limit === null ? "" : " LIMIT " + Math.floor(limit)}`;
    const rows = await this.dataSource.query(sql, [company[0].id]);
    return rows.map((r: any) => toSavedJob(r, company[0]));
  }

  async delete(companySlug: string, externalOrJobId: string): Promise<void> {
    const company = await this.dataSource.query(`SELECT id FROM companies WHERE slug = $1 LIMIT 1`, [companySlug]);
    if (!company[0]) return;
    await this.dataSource.query(`DELETE FROM jobs WHERE company_id = $1 AND external_id = $2`, [company[0].id, externalOrJobId]);
  }

  async count(): Promise<number> {
    const rows = await this.dataSource.query(`SELECT COUNT(*)::int AS c FROM jobs`);
    return Number(rows[0]?.c ?? 0);
  }

  async countByCompany(companySlug: string): Promise<number> {
    const company = await this.dataSource.query(`SELECT id FROM companies WHERE slug = $1 LIMIT 1`, [companySlug]);
    if (!company[0]) return 0;
    const rows = await this.dataSource.query(`SELECT COUNT(*)::int AS c FROM jobs WHERE company_id = $1`, [company[0].id]);
    return Number(rows[0]?.c ?? 0);
  }

  async getByCompanyId(companyId: number): Promise<JobRow[]> {
    const rows = await this.dataSource.query(
      `SELECT id, company_id, external_id, title, location, url, description, raw_json, content_hash, status, first_seen_at, last_seen_at, closed_at, created_at, updated_at FROM jobs WHERE company_id = $1`,
      [companyId],
    );
    return rows.map(toJobRow);
  }

  async updateLastSeen(jobId: string, lastSeenAt: string): Promise<void> {
    await this.dataSource.query(`UPDATE jobs SET last_seen_at = $1, updated_at = $1 WHERE id = $2`, [lastSeenAt, jobId]);
  }

  async markClosedMissing(companyId: number, seenExternalIds: string[], manager?: EntityManager): Promise<number> {
    const q = manager ?? this.dataSource;
    const openJobs = (await q.query(
      `SELECT id, external_id FROM jobs WHERE company_id = $1 AND status = 'open'`,
      [companyId],
    )) as Array<{ id: string; external_id: string }>;
    const seen = new Set(seenExternalIds);
    const toClose = openJobs.filter((j) => !seen.has(j.external_id)).map((j) => j.id);
    if (toClose.length === 0) return 0;
    const now = new Date().toISOString();
    await q.query(
      `UPDATE jobs SET status = 'closed', closed_at = $1, updated_at = $1 WHERE id = ANY($2)`,
      [now, toClose],
    );
    return toClose.length;
  }

  getJobDetail(jobId: string) {
    return getJobDetail(this.dataSource, jobId);
  }

  computeContentHash(input: { title: string; location: string; url: string; description: string; rawJson: unknown }): string {
    return computeContentHash(input);
  }
}

function toJobRow(row: any): JobRow {
  return {
    id: row.id,
    companyId: Number(row.company_id),
    externalId: row.external_id,
    title: row.title,
    location: row.location,
    url: row.url,
    description: row.description,
    rawJson: typeof row.raw_json === "string" ? row.raw_json : JSON.stringify(row.raw_json ?? {}),
    contentHash: row.content_hash,
    status: row.status,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    closedAt: row.closed_at ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toSavedJob(row: any, company: { slug: string; name?: string; ats?: string }): SavedJob {
  return {
    id: row.id,
    companyId: row.company_id,
    companySlug: company.slug,
    companyName: company.name || company.slug,
    ats: company.ats || row.ats || "",
    jobId: row.id,
    externalId: row.external_id,
    url: row.url,
    title: row.title,
    location: row.location,
    description: row.description,
    rawJson: row.raw_json,
    contentHash: row.content_hash,
    status: row.status,
    firstSeenAt: row.first_seen_at,
    lastSeenAt: row.last_seen_at,
    closedAt: row.closed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function computeContentHash(value: {
  title: string;
  location: string;
  url: string;
  description: string;
  rawJson: unknown;
}): string {
  const rawJson = typeof value.rawJson === "string" ? value.rawJson : JSON.stringify(value.rawJson ?? {});
  return createHash("sha256")
    .update(JSON.stringify({ title: value.title, location: value.location, url: value.url, description: value.description, rawJson }))
    .digest("hex");
}

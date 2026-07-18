import { Injectable } from "@nestjs/common";
import { DataSource, type EntityManager } from "typeorm";
import type { AtsPlatform, CompanyRecord } from "../../shared/types";
import { slug, endpointForAts } from "../../common/paths";

function toCompanyRecord(row: any): CompanyRecord {
  return {
    id: Number(row.id),
    slug: row.slug,
    name: row.name,
    ats: row.ats,
    endpoint: row.endpoint,
    boardUrl: row.endpoint,
    discoveredAt: row.discovered_at,
    lastFetchedAt: row.last_fetched_at ?? null,
    lastSuccessfulFetchAt: row.last_successful_fetch_at ?? null,
    lastErrorAt: row.last_error_at ?? null,
    lastError: row.last_error ?? null,
    active: Boolean(row.active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type CreateCompanyInput = {
  slug?: string;
  name: string;
  ats: AtsPlatform;
  endpoint?: string;
  boardUrl?: string;
};

@Injectable()
export class CompaniesRepository {
  constructor(private readonly dataSource: DataSource) {}

  async getActive(): Promise<CompanyRecord[]> {
    const rows = await this.dataSource.query(
      `SELECT id, slug, ats, endpoint, name, active, discovered_at, last_fetched_at, last_successful_fetch_at, last_error_at, last_error, created_at, updated_at FROM companies WHERE active = 1 ORDER BY slug ASC`,
    );
    return rows.map(toCompanyRecord);
  }

  async getBySlug(s: string): Promise<CompanyRecord | undefined> {
    const rows = await this.dataSource.query(
      `SELECT id, slug, ats, endpoint, name, active, discovered_at, last_fetched_at, last_successful_fetch_at, last_error_at, last_error, created_at, updated_at FROM companies WHERE slug = $1 LIMIT 1`,
      [s],
    );
    return rows[0] ? toCompanyRecord(rows[0]) : undefined;
  }

  async getById(id: number): Promise<CompanyRecord | undefined> {
    const rows = await this.dataSource.query(
      `SELECT id, slug, ats, endpoint, name, active, discovered_at, last_fetched_at, last_successful_fetch_at, last_error_at, last_error, created_at, updated_at FROM companies WHERE id = $1 LIMIT 1`,
      [id],
    );
    return rows[0] ? toCompanyRecord(rows[0]) : undefined;
  }

  async getAll(): Promise<CompanyRecord[]> {
    const rows = await this.dataSource.query(
      `SELECT id, slug, ats, endpoint, name, active, discovered_at, last_fetched_at, last_successful_fetch_at, last_error_at, last_error, created_at, updated_at FROM companies ORDER BY slug ASC`,
    );
    return rows.map(toCompanyRecord);
  }

  async save(input: CreateCompanyInput, manager?: EntityManager): Promise<boolean> {
    const s = input.slug ?? slug(input.name);
    const endpoint = input.endpoint ?? input.boardUrl ?? endpointForAts(s, input.ats);
    const now = new Date().toISOString();
    const q = manager ?? this.dataSource;
    try {
      await q.query(
        `INSERT INTO companies (slug, name, ats, endpoint, discovered_at, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (slug) DO NOTHING`,
        [s, input.name, input.ats, endpoint, now, now, now],
      );
      return true;
    } catch {
      return false;
    }
  }

  async updateFetchedAt(s: string, manager?: EntityManager): Promise<void> {
    const now = new Date().toISOString();
    const q = manager ?? this.dataSource;
    await q.query(
      `UPDATE companies SET last_fetched_at = $1, last_successful_fetch_at = $1, last_error = NULL, last_error_at = NULL, updated_at = $1 WHERE slug = $2`,
      [now, s],
    );
  }

  async updateFetchError(s: string, error: string): Promise<void> {
    const now = new Date().toISOString();
    await this.dataSource.query(
      `UPDATE companies SET last_fetched_at = $1, last_error = $2, last_error_at = $1, updated_at = $1 WHERE slug = $3`,
      [now, error, s],
    );
  }

  async deactivate(s: string): Promise<void> {
    const now = new Date().toISOString();
    await this.dataSource.query(`UPDATE companies SET active = 0, updated_at = $1 WHERE slug = $2`, [now, s]);
  }

  async reactivate(s: string): Promise<void> {
    const now = new Date().toISOString();
    await this.dataSource.query(`UPDATE companies SET active = 1, updated_at = $1 WHERE slug = $2`, [now, s]);
  }

  async updateAts(s: string, ats: AtsPlatform, endpoint: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE companies SET ats = $1, endpoint = $2, updated_at = CURRENT_TIMESTAMP WHERE slug = $3`,
      [ats, endpoint, s],
    );
  }

  async countPerAts(): Promise<Array<{ ats: string; count: number }>> {
    const rows = await this.dataSource.query(
      `SELECT ats, COUNT(*)::int AS count FROM companies WHERE active = 1 GROUP BY ats ORDER BY ats ASC`,
    );
    return rows.map((r: any) => ({ ats: r.ats, count: Number(r.count) }));
  }

  async seed(companiesList: Array<{ slug: string; name: string; ats: AtsPlatform }>): Promise<number> {
    let count = 0;
    for (const c of companiesList) {
      const endpoint = endpointForAts(c.slug, c.ats);
      const existing = await this.getBySlug(c.slug);
      if (!existing) {
        await this.save({ slug: c.slug, name: c.name, ats: c.ats, endpoint });
        count++;
      }
    }
    return count;
  }
}

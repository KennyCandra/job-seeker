import { eq, asc, sql } from "drizzle-orm";
import { Repository } from "../repository";
import { companies } from "../schema";
import { slug, endpointForAts } from "../../shared/index";
import type { AtsPlatform, CompanyRecord } from "../../shared/types";

export type CreateCompanyInput = {
  slug?: string;
  name: string;
  ats: AtsPlatform;
  endpoint?: string;
  boardUrl?: string;
};

function toCompanyRecord(row: any): CompanyRecord {
  return {
    ...row,
    active: Boolean(row.active),
    endpoint: row.endpoint,
    boardUrl: row.endpoint,
  };
}

export class CompaniesRepository extends Repository {
  async getActive(): Promise<CompanyRecord[]> {
    const rows = await this.db.select().from(companies).where(eq(companies.active, 1)).orderBy(asc(companies.slug));
    return rows.map(toCompanyRecord);
  }

  async getBySlug(slug: string): Promise<CompanyRecord | undefined> {
    const [r] = await this.db.select().from(companies).where(eq(companies.slug, slug)).limit(1);
    return r ? toCompanyRecord(r) : undefined;
  }

  async getById(id: number): Promise<CompanyRecord | undefined> {
    const [r] = await this.db.select().from(companies).where(eq(companies.id, id)).limit(1);
    return r ? toCompanyRecord(r) : undefined;
  }

  async getAll(): Promise<CompanyRecord[]> {
    const rows = await this.db.select().from(companies).orderBy(asc(companies.slug));
    return rows.map(toCompanyRecord);
  }

  async save(input: CreateCompanyInput): Promise<boolean> {
    const s = input.slug ?? slug(input.name);
    const endpoint = input.endpoint ?? input.boardUrl ?? endpointForAts(s, input.ats);
    const now = new Date().toISOString();
    try {
      await this.db.insert(companies).values({ slug: s, name: input.name, ats: input.ats, endpoint, discoveredAt: now, createdAt: now, updatedAt: now });
      return true;
    } catch {
      return false;
    }
  }

  async updateFetchedAt(slug: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.update(companies).set({ lastFetchedAt: now, lastSuccessfulFetchAt: now, lastError: null, lastErrorAt: null, updatedAt: now }).where(eq(companies.slug, slug));
  }

  async updateFetchError(slug: string, error: string): Promise<void> {
    const now = new Date().toISOString();
    await this.db.update(companies).set({ lastFetchedAt: now, lastError: error, lastErrorAt: now, updatedAt: now }).where(eq(companies.slug, slug));
  }

  async deactivate(slug: string): Promise<void> {
    await this.db.update(companies).set({ active: 0, updatedAt: this.now() }).where(eq(companies.slug, slug));
  }

  async reactivate(slug: string): Promise<void> {
    await this.db.update(companies).set({ active: 1, updatedAt: this.now() }).where(eq(companies.slug, slug));
  }

  async updateAts(slug: string, ats: AtsPlatform, endpoint: string): Promise<void> {
    await this.db.update(companies).set({ ats, endpoint, updatedAt: this.now() }).where(eq(companies.slug, slug));
  }

  async countPerAts(): Promise<Array<{ ats: string; count: number }>> {
    const rows = await this.db.select({ ats: companies.ats, count: sql<number>`COUNT(*)` })
      .from(companies)
      .where(eq(companies.active, 1))
      .groupBy(companies.ats)
      .orderBy(asc(companies.ats));
    return rows.map((row) => ({ ats: row.ats, count: Number(row.count) }));
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

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
  getActive(): CompanyRecord[] {
    return this.db.select().from(companies).where(eq(companies.active, 1)).orderBy(asc(companies.slug)).all().map(toCompanyRecord);
  }

  getBySlug(slug: string): CompanyRecord | undefined {
    const r = this.db.select().from(companies).where(eq(companies.slug, slug)).get();
    return r ? toCompanyRecord(r) : undefined;
  }

  getById(id: number): CompanyRecord | undefined {
    const r = this.db.select().from(companies).where(eq(companies.id, id)).get();
    return r ? toCompanyRecord(r) : undefined;
  }

  getAll(): CompanyRecord[] {
    return this.db.select().from(companies).orderBy(asc(companies.slug)).all().map(toCompanyRecord);
  }

  save(input: CreateCompanyInput): boolean {
    const s = input.slug ?? slug(input.name);
    const endpoint = input.endpoint ?? input.boardUrl ?? endpointForAts(s, input.ats);
    const now = new Date().toISOString();
    try {
      this.db.insert(companies).values({ slug: s, name: input.name, ats: input.ats, endpoint, discoveredAt: now, createdAt: now, updatedAt: now }).run();
      return true;
    } catch {
      return false;
    }
  }

  updateFetchedAt(slug: string): void {
    const now = new Date().toISOString();
    this.db.update(companies).set({ lastFetchedAt: now, lastSuccessfulFetchAt: now, lastError: null, lastErrorAt: null, updatedAt: now }).where(eq(companies.slug, slug)).run();
  }

  updateFetchError(slug: string, error: string): void {
    const now = new Date().toISOString();
    this.db.update(companies).set({ lastFetchedAt: now, lastError: error, lastErrorAt: now, updatedAt: now }).where(eq(companies.slug, slug)).run();
  }

  deactivate(slug: string): void {
    this.db.update(companies).set({ active: 0, updatedAt: this.now() }).where(eq(companies.slug, slug)).run();
  }

  reactivate(slug: string): void {
    this.db.update(companies).set({ active: 1, updatedAt: this.now() }).where(eq(companies.slug, slug)).run();
  }

  updateAts(slug: string, ats: AtsPlatform, endpoint: string): void {
    this.db.update(companies).set({ ats, endpoint, updatedAt: this.now() }).where(eq(companies.slug, slug)).run();
  }

  countPerAts(): Array<{ ats: string; count: number }> {
    return this.db.select({ ats: companies.ats, count: sql<number>`COUNT(*)` }).from(companies).where(eq(companies.active, 1)).groupBy(companies.ats).orderBy(asc(companies.ats)).all() as Array<{ ats: string; count: number }>;
  }

  seed(companiesList: Array<{ slug: string; name: string; ats: AtsPlatform }>): number {
    let count = 0;
    for (const c of companiesList) {
      const endpoint = endpointForAts(c.slug, c.ats);
      const existing = this.getBySlug(c.slug);
      if (!existing) {
        this.save({ slug: c.slug, name: c.name, ats: c.ats, endpoint });
        count++;
      }
    }
    return count;
  }
}

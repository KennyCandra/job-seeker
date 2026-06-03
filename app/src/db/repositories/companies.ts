import { eq, asc, sql } from "drizzle-orm";
import { Repository } from "../repository";
import { companies } from "../schema";
import { slug, boardUrlForAts } from "../../shared/index";
import type { AtsPlatform, CompanyRecord } from "../../shared/types";

export type CreateCompanyInput = {
  slug?: string;
  name: string;
  ats: AtsPlatform;
  boardUrl?: string;
};

export class CompaniesRepository extends Repository {
  getActive(): CompanyRecord[] {
    return this.db.select().from(companies).where(eq(companies.active, 1)).orderBy(asc(companies.slug)).all() as CompanyRecord[];
  }

  getBySlug(slug: string): CompanyRecord | undefined {
    const r = this.db.select().from(companies).where(eq(companies.slug, slug)).get();
    return r as CompanyRecord | undefined;
  }

  getById(id: number): CompanyRecord | undefined {
    const r = this.db.select().from(companies).where(eq(companies.id, id)).get();
    return r as CompanyRecord | undefined;
  }

  getAll(): CompanyRecord[] {
    return this.db.select().from(companies).orderBy(asc(companies.slug)).all() as CompanyRecord[];
  }

  save(input: CreateCompanyInput): boolean {
    const s = input.slug ?? slug(input.name);
    const boardUrl = input.boardUrl ?? boardUrlForAts(s, input.ats);
    const now = new Date().toISOString();
    try {
      this.db.insert(companies).values({ slug: s, name: input.name, ats: input.ats, boardUrl, discoveredAt: now }).run();
      return true;
    } catch {
      return false;
    }
  }

  updateFetchedAt(slug: string): void {
    this.db.update(companies).set({ lastFetchedAt: new Date().toISOString() }).where(eq(companies.slug, slug)).run();
  }

  deactivate(slug: string): void {
    this.db.update(companies).set({ active: 0 }).where(eq(companies.slug, slug)).run();
  }

  reactivate(slug: string): void {
    this.db.update(companies).set({ active: 1 }).where(eq(companies.slug, slug)).run();
  }

  updateAts(slug: string, ats: AtsPlatform, boardUrl: string): void {
    this.db.update(companies).set({ ats, boardUrl }).where(eq(companies.slug, slug)).run();
  }

  countPerAts(): Array<{ ats: string; count: number }> {
    return this.db.select({ ats: companies.ats, count: sql<number>`COUNT(*)` }).from(companies).where(eq(companies.active, 1)).groupBy(companies.ats).orderBy(asc(companies.ats)).all() as Array<{ ats: string; count: number }>;
  }

  seed(companiesList: Array<{ slug: string; name: string; ats: AtsPlatform }>): number {
    let count = 0;
    for (const c of companiesList) {
      const boardUrl = boardUrlForAts(c.slug, c.ats);
      const existing = this.getBySlug(c.slug);
      if (!existing) {
        this.save({ slug: c.slug, name: c.name, ats: c.ats, boardUrl });
        count++;
      }
    }
    return count;
  }
}

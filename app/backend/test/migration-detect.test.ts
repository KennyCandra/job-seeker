import { describe, it, expect, afterEach } from "bun:test";
import type { DataSource } from "typeorm";
import { JobsIngestionService } from "../src/jobs/ingestion.service";
import { CompaniesRepository } from "../src/database/repositories/companies.repository";
import { JobsRepository } from "../src/database/repositories/jobs.repository";

const originalFetch = globalThis.fetch;

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

/**
 * Fake DataSource covering the exact SQL shapes CompaniesRepository and
 * JobsRepository issue during a migration-detection + ingestion cycle, so
 * the full flow (probe -> ingest -> only-then persist company row) can be
 * exercised without a live Postgres instance.
 */
class FakeDataSource {
  company: Record<string, unknown>;
  jobs = new Map<string, Record<string, unknown>>();
  updateAtsCalls: unknown[][] = [];
  reactivateCalls: unknown[][] = [];
  updateFetchedAtCalls: unknown[][] = [];

  constructor(company: Record<string, unknown>) {
    this.company = company;
  }

  async query(sql: string, params: unknown[] = []): Promise<any[]> {
    if (sql.startsWith("SELECT id, slug, ats, endpoint, name, active") && sql.includes("WHERE slug = $1")) {
      return this.company.slug === params[0] ? [this.company] : [];
    }
    if (sql.startsWith("UPDATE companies SET ats =")) {
      this.updateAtsCalls.push(params);
      this.company = { ...this.company, ats: params[0], endpoint: params[1] };
      return [];
    }
    if (sql.includes("UPDATE companies SET active = 1")) {
      this.reactivateCalls.push(params);
      this.company = { ...this.company, active: 1 };
      return [];
    }
    if (sql.includes("UPDATE companies SET last_fetched_at")) {
      this.updateFetchedAtCalls.push(params);
      return [];
    }
    if (sql.startsWith("SELECT id, slug, name, ats FROM companies WHERE slug")) {
      return this.company.slug === params[0] ? [this.company] : [];
    }
    if (sql.startsWith("SELECT j.* FROM jobs j WHERE j.company_id")) {
      // jobs.get(): no pre-existing jobs in this scenario
      return [];
    }
    if (sql.startsWith("INSERT INTO jobs")) {
      const [id, companyId, externalId] = params as string[];
      this.jobs.set(id, { id, company_id: companyId, external_id: externalId, status: "open" });
      return [];
    }
    if (sql.startsWith("SELECT id, external_id FROM jobs WHERE company_id")) {
      return [...this.jobs.values()].filter((j) => j.status === "open");
    }
    if (sql.startsWith("UPDATE jobs SET status = 'closed'")) {
      return [];
    }
    return [];
  }
}

describe("JobsIngestionService.detectMigration (Amplemarket acceptance test)", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("detects greenhouse, ingests jobs, and only then updates the company row", async () => {
    const fetchCalls: string[] = [];
    globalThis.fetch = (async (input: any) => {
      const url = String(input);
      fetchCalls.push(url);
      if (url.includes("boards-api.greenhouse.io")) {
        return jsonResponse(200, {
          jobs: [
            { id: 101, title: "Backend Engineer", location: { name: "Remote" }, absolute_url: "https://boards.greenhouse.io/amplemarket/jobs/101" },
            { id: 102, title: "Frontend Engineer", location: { name: "Remote" }, absolute_url: "https://boards.greenhouse.io/amplemarket/jobs/102" },
          ],
        });
      }
      if (url.includes("api.lever.co")) {
        return jsonResponse(404, {});
      }
      throw new Error(`unexpected fetch to ${url}`);
    }) as any;

    const ds = new FakeDataSource({
      id: 42,
      slug: "amplemarket",
      name: "Amplemarket",
      ats: "ashby",
      endpoint: "https://api.ashbyhq.com/posting-api/job-board/amplemarket?includeCompensation=true",
      active: 0,
      discovered_at: new Date().toISOString(),
      last_fetched_at: null,
      last_successful_fetch_at: null,
      last_error_at: new Date().toISOString(),
      last_error: "404",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const companies = new CompaniesRepository(ds as unknown as DataSource);
    const jobs = new JobsRepository(ds as unknown as DataSource);
    const service = new JobsIngestionService(ds as unknown as DataSource, companies, jobs);

    const result = await service.detectMigration("amplemarket", "ashby");

    expect(result.detected).toBe(true);
    expect(result.ats).toBe("greenhouse");
    expect(result.endpoint).toContain("boards-api.greenhouse.io");
    expect(result.fetched).toBe(2);

    // exactly one successful greenhouse fetch, no raw payload round-tripped through Redis/queues
    expect(fetchCalls.filter((u) => u.includes("greenhouse"))).toHaveLength(1);
    // ashby (prevAts) never re-probed
    expect(fetchCalls.some((u) => u.includes("ashbyhq"))).toBe(false);

    // company row updated to the new ATS + canonical endpoint, reactivated
    expect(ds.updateAtsCalls).toHaveLength(1);
    expect(ds.updateAtsCalls[0][0]).toBe("greenhouse");
    expect(ds.reactivateCalls).toHaveLength(1);
    expect(ds.company.active).toBe(1);

    // jobs were actually ingested
    expect(ds.jobs.size).toBe(2);
    expect([...ds.jobs.values()].every((j) => j.status === "open")).toBe(true);
  });

  it("leaves the company untouched and reports attempted platforms when nothing matches", async () => {
    globalThis.fetch = (async () => jsonResponse(404, {})) as any;

    const ds = new FakeDataSource({
      id: 7,
      slug: "ghost-co",
      name: "Ghost Co",
      ats: "greenhouse",
      endpoint: "https://boards-api.greenhouse.io/v1/boards/ghost-co/jobs?content=true",
      active: 0,
    });
    const companies = new CompaniesRepository(ds as unknown as DataSource);
    const jobs = new JobsRepository(ds as unknown as DataSource);
    const service = new JobsIngestionService(ds as unknown as DataSource, companies, jobs);

    const result = await service.detectMigration("ghost-co", "greenhouse");

    expect(result.detected).toBe(false);
    expect(result.attempted?.sort()).toEqual(["ashby", "lever"]);
    expect(ds.updateAtsCalls).toHaveLength(0);
    expect(ds.reactivateCalls).toHaveLength(0);
  });
});

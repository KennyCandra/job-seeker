import { CompaniesRepository } from "../src/database/repositories/companies.repository";
import { JobsRepository } from "../src/database/repositories/jobs.repository";
import { ApplicationsRepository } from "../src/database/repositories/applications.repository";
import { TaskRunsRepository } from "../src/database/repositories/task-runs.repository";
import { TaskRunLogsRepository } from "../src/database/repositories/task-run-logs.repository";
import { ApplicationRunStepsRepository } from "../src/database/repositories/application-run-steps.repository";
import type { DataSource } from "typeorm";

/**
 * A minimal fake DataSource that records executed queries and returns
 * scripted rows. This lets the repository integration tests assert that
 * (a) the returned values are mapped correctly and (b) the stored values /
 * WHERE clauses are correct — all without a live database.
 */
class FakeDataSource {
  public calls: Array<{ sql: string; params: unknown[] }> = [];
  private responders: Array<(sql: string, params: unknown[]) => any[]>;
  public lastInserts: Array<{ table: string; values: any[] }> = [];

  constructor(responders: Array<(sql: string, params: unknown[]) => any[]> = []) {
    this.responders = responders;
  }

  async query(sql: string, params: unknown[] = []): Promise<any[]> {
    this.calls.push({ sql, params });
    for (const respond of this.responders) {
      const result = respond(sql, params);
      if (result !== undefined) return result;
    }
    return [];
  }
}

function makeDataSource(responders: Array<(sql: string, params: unknown[]) => any[]> = []): DataSource {
  return new FakeDataSource(responders) as unknown as DataSource;
}

describe("CompaniesRepository", () => {
  it("updateFetchError stores the error on the company identified by slug ($3)", async () => {
    const ds = makeDataSource([() => []]);
    const repo = new CompaniesRepository(ds as any);

    await repo.updateFetchError("acme", "boom");

    const call = (ds as any).calls.find((c: any) => c.sql.includes("UPDATE companies"));
    expect(call).toBeDefined();
    // slug MUST be bound to the placeholder used in the WHERE clause.
    // SQL: ... last_error = $2, last_error_at = $1 WHERE slug = $3
    expect(call.params[0]).toMatch(/^\d{4}-\d{2}-\d{2}T/); // $1 = now
    expect(call.params[1]).toBe("boom"); // $2 = error
    expect(call.params[2]).toBe("acme"); // $3 = slug
    expect(call.sql).toContain("WHERE slug = $3");
  });

  it("updateFetchError does not cross wires to a different company", async () => {
    const ds = makeDataSource([() => []]);
    const repo = new CompaniesRepository(ds as any);
    await repo.updateFetchError("acme", "boom");

    const call = (ds as any).calls.find((c: any) => c.sql.includes("UPDATE companies"));
    // If the bug (slug bound to $2) were present, params[1] would be "acme"
    // and params[2] would be undefined/error. Assert the correct binding.
    expect(call.params[2]).toBe("acme");
    expect(call.params[1]).not.toBe("acme");
  });

  it("updateAts binds ats, endpoint, slug in the right order", async () => {
    const ds = makeDataSource([() => []]);
    const repo = new CompaniesRepository(ds as any);
    await repo.updateAts("acme", "greenhouse", "https://acme.co");

    const call = (ds as any).calls.find((c: any) => c.sql.includes("UPDATE companies") && c.sql.includes("ats ="));
    expect(call).toBeDefined();
    expect(call.params[0]).toBe("greenhouse"); // $1 ats
    expect(call.params[1]).toBe("https://acme.co"); // $2 endpoint
    expect(call.params[2]).toBe("acme"); // $3 slug
  });

  it("getBySlug maps a snake_case row to a CompanyRecord", async () => {
    const ds = makeDataSource([
      () => [
        {
          id: 7,
          slug: "acme",
          ats: "greenhouse",
          endpoint: "https://acme.co",
          name: "Acme",
          active: 1,
          discovered_at: "2024-01-01T00:00:00.000Z",
          last_fetched_at: null,
          last_successful_fetch_at: null,
          last_error_at: null,
          last_error: null,
          created_at: "2024-01-01T00:00:00.000Z",
          updated_at: "2024-01-01T00:00:00.000Z",
        },
      ],
    ]);
    const repo = new CompaniesRepository(ds as any);
    const result = await repo.getBySlug("acme");

    expect(result).toBeDefined();
    expect(result!.id).toBe(7);
    expect(result!.active).toBe(true);
    expect(result!.lastFetchedAt).toBeNull();
    expect(result!.slug).toBe("acme");
  });
});

describe("JobsRepository", () => {
  const rawJobRow = {
    id: "job_1",
    company_id: 42,
    external_id: "ext_1",
    title: "Engineer",
    location: "Remote",
    url: "https://example.com/job",
    description: "desc",
    raw_json: "{}",
    content_hash: "h",
    status: "open",
    first_seen_at: "2024-01-01T00:00:00.000Z",
    last_seen_at: "2024-01-02T00:00:00.000Z",
    closed_at: null,
    created_at: "2024-01-01T00:00:00.000Z",
    updated_at: "2024-01-02T00:00:00.000Z",
    company_slug: "acme",
    company_name: "Acme",
    ats: "greenhouse",
  };

  it("getById returns a mapped JobWithCompany with numeric companyId", async () => {
    const ds = makeDataSource([() => [rawJobRow]]);
    const repo = new JobsRepository(ds as any);
    const result = await repo.getById("job_1");

    expect(result).toBeDefined();
    // camelCase, not snake_case
    expect((result as any).company_id).toBeUndefined();
    expect(result!.companyId).toBe(42);
    expect(typeof result!.companyId).toBe("number");
    expect(result!.externalId).toBe("ext_1");
    expect(result!.companySlug).toBe("acme");
    expect(result!.closedAt).toBeNull();
  });

  it("getByCompanyId maps raw rows to JobRow[] (camelCase)", async () => {
    const ds = makeDataSource([() => [rawJobRow]]);
    const repo = new JobsRepository(ds as any);
    const rows = await repo.getByCompanyId(42);

    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBe(1);
    const row = rows[0];
    // never raw snake_case
    expect((row as any).company_id).toBeUndefined();
    expect((row as any).external_id).toBeUndefined();
    expect(row.companyId).toBe(42);
    expect(row.externalId).toBe("ext_1");
    expect(row.closedAt).toBeNull();
    expect(row.rawJson).toBe("{}");
  });

  it("getByCompanyId handles closedAt present", async () => {
    const row = { ...rawJobRow, closed_at: "2024-02-01T00:00:00.000Z" };
    const ds = makeDataSource([() => [row]]);
    const repo = new JobsRepository(ds as any);
    const rows = await repo.getByCompanyId(42);
    expect(rows[0].closedAt).toBe("2024-02-01T00:00:00.000Z");
  });
});

describe("ApplicationsRepository", () => {
  it("getByJobId maps a snake_case row to ApplicationRow", async () => {
    const ds = makeDataSource([
      () => [
        {
          id: "app_1",
          job_id: "job_1",
          status: "ready",
          score: 5,
          documents: "[]",
          notes: "",
          created_at: "2024-01-01T00:00:00.000Z",
          updated_at: "2024-01-02T00:00:00.000Z",
        },
      ],
    ]);
    const repo = new ApplicationsRepository(ds as any);
    const row = await repo.getByJobId("job_1");

    expect(row).toBeDefined();
    expect((row as any).job_id).toBeUndefined();
    expect(row!.jobId).toBe("job_1");
    expect(row!.score).toBe(5);
    expect(row!.status).toBe("ready");
    expect(row!.createdAt).toBe("2024-01-01T00:00:00.000Z");
  });

  it("getByJobId returns undefined when no row matches", async () => {
    const ds = makeDataSource([() => []]);
    const repo = new ApplicationsRepository(ds as any);
    const row = await repo.getByJobId("missing");
    expect(row).toBeUndefined();
  });

  it("getAll maps rows through the explicit mapper", async () => {
    const ds = makeDataSource([
      () => [
        {
          id: "app_1",
          job_id: "job_1",
          status: "ready",
          score: 0,
          documents: "[]",
          notes: "",
          created_at: "2024-01-01T00:00:00.000Z",
          updated_at: "2024-01-02T00:00:00.000Z",
        },
      ],
    ]);
    const repo = new ApplicationsRepository(ds as any);
    const rows = await repo.getAll();
    expect(rows.length).toBe(1);
    expect(rows[0].jobId).toBe("job_1");
  });
});

describe("TaskRunsRepository", () => {
  it("getById aliases snake_case columns to camelCase", async () => {
    const ds = makeDataSource([
      (sql) => (sql.includes("FROM task_runs") ? [{ id: "t1", bullJobId: "b1", resultJson: null }] : undefined),
    ]);
    const repo = new TaskRunsRepository(ds as any);
    await repo.getById("t1");
    const call = (ds as any).calls[0];
    // The SQL itself must carry the aliases — this is what SELECT * failed to do.
    expect(call.sql).toContain('bull_job_id AS "bullJobId"');
    expect(call.sql).toContain('result_json AS "resultJson"');
    expect(call.sql).toContain('created_at AS "createdAt"');
    expect(call.sql).not.toContain("SELECT *");
  });

  it("findActiveByDedupeKey returns an aliased row with bullJobId", async () => {
    const ds = makeDataSource([() => [{ id: "t1", bullJobId: "b9", status: "running" }]]);
    const repo = new TaskRunsRepository(ds as any);
    const row = await repo.findActiveByDedupeKey("k");
    expect(row!.bullJobId).toBe("b9");
    const call = (ds as any).calls[0];
    expect(call.sql).toContain('bull_job_id AS "bullJobId"');
    expect(call.sql).not.toContain("SELECT *");
  });

  it("listRecent binds limit to $1 and can filter by status", async () => {
    const ds = makeDataSource([() => []]);
    const repo = new TaskRunsRepository(ds as any);
    await repo.listRecent(250, "queued");
    const call = (ds as any).calls[0];
    expect(call.params[0]).toBe(250); // $1 = limit
    expect(call.params[1]).toBe("queued"); // $2 = status
    expect(call.sql).toContain("WHERE status = $2");
    expect(call.sql).toContain("LIMIT $1");
  });

  it("countByStatuses issues per-status FILTER aggregates", async () => {
    const ds = makeDataSource([() => [{ total: 3, queued: 1, running: 0, completed: 2, failed: 0, cancelled: 0 }]]);
    const repo = new TaskRunsRepository(ds as any);
    const counts = await repo.countByStatuses();
    expect(counts.total).toBe(3);
    const call = (ds as any).calls[0];
    expect(call.sql).toContain("FILTER (WHERE status = 'queued')");
  });

  it("getStatusesByIds returns [] without querying when given no ids", async () => {
    const ds = makeDataSource([() => []]);
    const repo = new TaskRunsRepository(ds as any);
    const rows = await repo.getStatusesByIds([]);
    expect(rows).toEqual([]);
    expect((ds as any).calls.length).toBe(0);
  });

  it("getStatusesByIds binds ids to a single ANY($1) query", async () => {
    const ds = makeDataSource([() => [{ id: "t1", status: "completed" }]]);
    const repo = new TaskRunsRepository(ds as any);
    await repo.getStatusesByIds(["t1", "t2"]);
    expect((ds as any).calls.length).toBe(1);
    const call = (ds as any).calls[0];
    expect(call.sql).toContain("id = ANY($1)");
    expect(call.params[0]).toEqual(["t1", "t2"]);
  });

  it("updateResult serializes exactly once (stored value parses to an object)", async () => {
    const ds = makeDataSource([() => []]);
    const repo = new TaskRunsRepository(ds as any);
    await repo.updateResult("t1", { a: 1 });
    const call = (ds as any).calls.find((c: any) => c.sql.includes("result_json = $1"));
    expect(call).toBeDefined();
    const param = call.params[0];
    // Single-stringified: JSON.parse yields the object, not a string.
    expect(typeof JSON.parse(param as string)).toBe("object");
    expect(JSON.parse(param as string)).toEqual({ a: 1 });
  });
});

describe("TaskRunLogsRepository", () => {
  it("getByRunId aliases columns and never SELECT *", async () => {
    const ds = makeDataSource([() => []]);
    const repo = new TaskRunLogsRepository(ds as any);
    await repo.getByRunId("t1");
    const call = (ds as any).calls[0];
    expect(call.sql).toContain('created_at AS "createdAt"');
    expect(call.sql).toContain('run_id AS "runId"');
    expect(call.sql).not.toContain("SELECT *");
  });
});

describe("ApplicationRunStepsRepository", () => {
  it("getByRunId aliases screenshot_path to screenshotPath", async () => {
    const ds = makeDataSource([() => [{ id: "s1", runId: "r1", screenshotPath: "a.png" }]]);
    const repo = new ApplicationRunStepsRepository(ds as any);
    const rows = await repo.getByRunId("r1");
    expect(rows[0].screenshotPath).toBe("a.png");
    const call = (ds as any).calls[0];
    expect(call.sql).toContain('screenshot_path AS "screenshotPath"');
    expect(call.sql).not.toContain("SELECT *");
  });
});

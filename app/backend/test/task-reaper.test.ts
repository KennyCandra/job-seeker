import { describe, it, expect } from "bun:test";
import { TaskReaperService } from "../src/tasks/task-reaper.service";
import { listTasksQuerySchema } from "../src/common/dto";

type RunRow = { id: string; bullJobId: string | null; status: string; startedAt?: string | null };

function makeReaper(opts: {
  running: RunRow[];
  jobState: Record<string, string | null>; // bullJobId -> state, or null = getJob returns null
}) {
  const errored: Array<{ id: string; error: string }> = [];
  const taskRuns = {
    getByStatus: async () => opts.running,
    updateError: async (id: string, error: string) => {
      errored.push({ id, error });
    },
  };
  const queue = {
    getJob: async (bullJobId: string) => {
      const state = opts.jobState[bullJobId];
      if (state == null) return null;
      return { getState: async () => state };
    },
  };
  const svc = new TaskReaperService(queue as any, taskRuns as any);
  return { svc, errored };
}

describe("TaskReaperService", () => {
  it("reaps a running row whose Bull job is missing", async () => {
    const { svc, errored } = makeReaper({
      running: [{ id: "t1", bullJobId: "b1", status: "running" }],
      jobState: { b1: null },
    });
    await svc.onApplicationBootstrap();
    expect(errored.length).toBe(1);
    expect(errored[0].id).toBe("t1");
    expect(errored[0].error).toContain("stale run reaped");
  });

  it("reaps a running row with no bullJobId at all", async () => {
    const { svc, errored } = makeReaper({
      running: [{ id: "t2", bullJobId: null, status: "running" }],
      jobState: {},
    });
    await svc.onApplicationBootstrap();
    expect(errored.map((e) => e.id)).toEqual(["t2"]);
  });

  it("does NOT reap a running row whose Bull job is still active", async () => {
    const { svc, errored } = makeReaper({
      running: [{ id: "t3", bullJobId: "b3", status: "running" }],
      jobState: { b3: "active" },
    });
    await svc.onApplicationBootstrap();
    expect(errored.length).toBe(0);
  });

  it("leaves waiting/delayed jobs untouched but reaps failed-state ones", async () => {
    const { svc, errored } = makeReaper({
      running: [
        { id: "waiting", bullJobId: "bw", status: "running" },
        { id: "delayed", bullJobId: "bd", status: "running" },
        { id: "gone", bullJobId: "bg", status: "running" },
      ],
      jobState: { bw: "waiting", bd: "delayed", bg: "failed" },
    });
    await svc.onApplicationBootstrap();
    expect(errored.map((e) => e.id)).toEqual(["gone"]);
  });

  it("does NOT reap a run this worker started after boot (startedAt >= bootTime)", async () => {
    // A run the boot-tick enqueued: startedAt is far in the future relative to
    // the reaper's construction, so it belongs to this worker and is skipped
    // even though its Bull job looks gone.
    const { svc, errored } = makeReaper({
      running: [{ id: "fresh", bullJobId: "bf", status: "running", startedAt: "2099-01-01T00:00:00.000Z" }],
      jobState: { bf: null },
    });
    await svc.onApplicationBootstrap();
    expect(errored.length).toBe(0);
  });

  it("reaps a genuinely-old stranded run (startedAt before boot) with a missing job", async () => {
    const { svc, errored } = makeReaper({
      running: [{ id: "old", bullJobId: "bo", status: "running", startedAt: "2000-01-01T00:00:00.000Z" }],
      jobState: { bo: null },
    });
    await svc.onApplicationBootstrap();
    expect(errored.map((e) => e.id)).toEqual(["old"]);
  });
});

describe("listTasksQuerySchema", () => {
  it("defaults limit to 100 when absent", () => {
    const parsed = listTasksQuerySchema.parse({});
    expect(parsed.limit).toBe(100);
    expect(parsed.status).toBeUndefined();
  });

  it("caps limit at 500", () => {
    expect(listTasksQuerySchema.safeParse({ limit: "9999" }).success).toBe(false);
  });

  it("rejects a bogus status", () => {
    expect(listTasksQuerySchema.safeParse({ status: "bogus" }).success).toBe(false);
  });

  it("coerces a numeric-string limit and accepts a valid status", () => {
    const parsed = listTasksQuerySchema.parse({ limit: "250", status: "queued" });
    expect(parsed.limit).toBe(250);
    expect(parsed.status).toBe("queued");
  });
});

import { describe, it, expect, afterEach } from "bun:test";
import { decideCatchUp } from "../src/scheduler/catch-up";
import { PipelineTasksService } from "../src/pipelines/pipeline.tasks";
import { OpenCodeClient } from "../src/shared/llm";

// ── decideCatchUp (pure) ────────────────────────────────────────────────────

function run(result: Record<string, unknown>, ageHours = 1): { completedAt: string; resultJson: string } {
  return {
    completedAt: new Date(Date.now() - ageHours * 3600_000).toISOString(),
    resultJson: JSON.stringify(result),
  };
}

describe("decideCatchUp", () => {
  const now = new Date();

  it("empty history -> full", () => {
    expect(decideCatchUp([], now, 20)).toBe("full");
  });

  it("fresh full+smart run -> none", () => {
    expect(decideCatchUp([run({ syncRan: true, smartFilterRan: true })], now, 20)).toBe("none");
  });

  it("fresh sync but smart never ran (LLM offline) -> smart-only", () => {
    expect(decideCatchUp([run({ syncRan: true, smartFilterRan: false })], now, 20)).toBe("smart-only");
  });

  it("only a stale successful run -> full", () => {
    expect(decideCatchUp([run({ syncRan: true, smartFilterRan: true }, 30)], now, 20)).toBe("full");
  });

  it("fresh sync-run + separate stale smart-run -> smart-only", () => {
    expect(
      decideCatchUp(
        [run({ syncRan: true, smartFilterRan: false }, 1), run({ syncRan: false, smartFilterRan: true }, 30)],
        now,
        20,
      ),
    ).toBe("smart-only");
  });

  it("malformed resultJson ignored -> full", () => {
    expect(decideCatchUp([{ completedAt: now.toISOString(), resultJson: "{not json" }], now, 20)).toBe("full");
  });

  it("fresh smart-only run alone (sync missing) -> full (sync still owed)", () => {
    expect(decideCatchUp([run({ syncRan: false, smartFilterRan: true })], now, 20)).toBe("full");
  });

  it("null completedAt ignored -> full", () => {
    expect(decideCatchUp([{ completedAt: null, resultJson: JSON.stringify({ syncRan: true, smartFilterRan: true }) }], now, 20)).toBe("full");
  });
});

// ── PipelineTasksService handler ────────────────────────────────────────────

type EnqueueCall = { type: string; payload: Record<string, unknown>; dedupeKey?: string };

function makeService(opts: {
  activeSlugs: string[];
  childStatus?: string; // status returned for every sync child
  snapshots?: number;
  smartRun?: { status: string; resultJson?: string | null; error?: string | null };
}) {
  const enqueues: EnqueueCall[] = [];
  const upsertCalls: string[] = [];
  let runCounter = 0;

  const registry = { register() {} };
  const queue = {
    async enqueueTask(type: string, payload: Record<string, unknown>, o: { dedupeKey?: string } = {}) {
      enqueues.push({ type, payload, dedupeKey: o.dedupeKey });
      return { runId: `run_${++runCounter}` };
    },
  };
  const taskRuns = {
    async getStatusesByIds(ids: string[]) {
      return ids.map((id) => ({ id, status: opts.childStatus ?? "completed" }));
    },
    async getById(_id: string) {
      return opts.smartRun ?? { status: "completed", resultJson: JSON.stringify({ processed: 3 }) };
    },
  };
  const companies = {
    async getActive() {
      return opts.activeSlugs.map((slug) => ({ slug }));
    },
  };
  const snapshots = {
    async upsertForDate(date: string) {
      upsertCalls.push(date);
      return opts.snapshots ?? opts.activeSlugs.length;
    },
  };
  const config = { get: () => undefined };

  const svc = new PipelineTasksService(
    registry as any,
    queue as any,
    taskRuns as any,
    companies as any,
    snapshots as any,
    config as any,
  );
  svc.pollMs = 1;
  return { svc, enqueues, upsertCalls };
}

function makeCtx(payload: Record<string, unknown> = {}) {
  return {
    runId: "pipeline_run",
    payload,
    log: async () => {},
    progress: async () => {},
    isCancelled: async () => false,
    throwIfCancelled: async () => {},
  };
}

describe("PipelineTasksService.dailyPipeline", () => {
  const realReachable = OpenCodeClient.prototype.isReachable;
  afterEach(() => {
    OpenCodeClient.prototype.isReachable = realReachable;
  });

  it("full run: syncs, snapshots, and smart-filters when LLM is up", async () => {
    OpenCodeClient.prototype.isReachable = async () => true;
    const { svc, enqueues, upsertCalls } = makeService({ activeSlugs: ["a", "b"], snapshots: 2 });

    const result = await (svc as any).dailyPipeline(makeCtx({}));

    const syncEnqueues = enqueues.filter((e) => e.type === "sync-company");
    expect(syncEnqueues.length).toBe(2);
    expect(syncEnqueues[0].dedupeKey).toBe("sync-company:a:true");
    expect(upsertCalls.length).toBe(1);
    expect(upsertCalls[0]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(enqueues.some((e) => e.type === "smart-filter-accepted")).toBe(true);
    expect(result.syncRan).toBe(true);
    expect(result.smartFilterRan).toBe(true);
    expect(result.snapshots).toBe(2);
  });

  it("LLM offline: syncs + snapshots but skips smart filter", async () => {
    OpenCodeClient.prototype.isReachable = async () => false;
    const { svc, enqueues, upsertCalls } = makeService({ activeSlugs: ["a", "b"] });

    const result = await (svc as any).dailyPipeline(makeCtx({}));

    expect(upsertCalls.length).toBe(1); // snapshot still written
    expect(enqueues.some((e) => e.type === "smart-filter-accepted")).toBe(false);
    expect(result.llmReachable).toBe(false);
    expect(result.smartFilterRan).toBe(false);
    expect(result.syncRan).toBe(true);
  });

  it("skipSync: no fan-out, no snapshot, LLM gate still runs", async () => {
    OpenCodeClient.prototype.isReachable = async () => true;
    const { svc, enqueues, upsertCalls } = makeService({ activeSlugs: ["a", "b"] });

    const result = await (svc as any).dailyPipeline(makeCtx({ skipSync: true }));

    expect(enqueues.some((e) => e.type === "sync-company")).toBe(false);
    expect(upsertCalls.length).toBe(0);
    expect(result.syncRan).toBe(false);
    expect(enqueues.some((e) => e.type === "smart-filter-accepted")).toBe(true);
    expect(result.smartFilterRan).toBe(true);
  });
});

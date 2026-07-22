import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TaskRegistry } from "../tasks/task-registry";
import { TaskQueueService } from "../tasks/task-queue.service";
import { TaskRunsRepository, CompaniesRepository, CompanySnapshotsRepository } from "../database/repositories";
import { OpenCodeClient } from "../shared/llm";
import type { TaskHandlerContext } from "../tasks/types";
import type { EnvConfig } from "../config/env";

export type DailyPipelineResult = {
  syncRan: boolean;
  companies: number;
  syncCompleted: number;
  syncFailed: number;
  syncCancelled: number;
  snapshotDate: string;
  snapshots: number;
  llmReachable: boolean;
  smartFilterRan: boolean;
  smartFilter: unknown;
};

/**
 * The one recurring job of the app: sync every active company, filter what
 * changed, snapshot the day's per-company counts (the time series that later
 * powers hiring signals — history cannot be backfilled), then run the LLM
 * smart filter over accepted jobs so the Shortlist page has a fresh
 * "apply to these" list.
 *
 * The smart-filter step is gated on OpenCode being reachable: when the LLM is
 * offline the pipeline still syncs and snapshots, reports smartFilterRan:false,
 * and the scheduler's hourly catch-up retries just that step later.
 */
@Injectable()
export class PipelineTasksService implements OnModuleInit {
  private readonly logger = new Logger(PipelineTasksService.name);
  /** Poll interval while waiting for child runs; overridable in tests. */
  pollMs = 5000;

  constructor(
    private readonly registry: TaskRegistry,
    private readonly queue: TaskQueueService,
    private readonly taskRuns: TaskRunsRepository,
    private readonly companies: CompaniesRepository,
    private readonly snapshots: CompanySnapshotsRepository,
    private readonly config: ConfigService<EnvConfig>,
  ) {}

  onModuleInit() {
    this.registry.register("daily-pipeline", this.dailyPipeline.bind(this));
  }

  private async dailyPipeline(ctx: TaskHandlerContext): Promise<DailyPipelineResult> {
    const { payload, log, progress, isCancelled, throwIfCancelled } = ctx;
    const skipSync = payload.skipSync === true;
    const result: DailyPipelineResult = {
      syncRan: false,
      companies: 0,
      syncCompleted: 0,
      syncFailed: 0,
      syncCancelled: 0,
      snapshotDate: new Date().toISOString().slice(0, 10),
      snapshots: 0,
      llmReachable: false,
      smartFilterRan: false,
      smartFilter: null,
    };

    // ── Step 1+2: sync fan-out and wait ───────────────────────────────────
    if (!skipSync) {
      const active = await this.companies.getActive();
      result.companies = active.length;
      await log("info", `Daily pipeline: fanning out sync for ${active.length} active companies`);

      const childIds: string[] = [];
      for (const company of active) {
        const { runId } = await this.queue.enqueueTask(
          "sync-company",
          { companySlug: company.slug, filter: true },
          { dedupeKey: `sync-company:${company.slug}:true` },
        );
        childIds.push(runId);
      }

      while (true) {
        if (await isCancelled()) {
          await log("warn", "Daily pipeline cancelled while waiting for syncs — children keep running");
          throw new Error("Task cancelled");
        }
        const statuses = await this.taskRuns.getStatusesByIds(childIds);
        const byStatus: Record<string, number> = {};
        for (const s of statuses) byStatus[s.status] = (byStatus[s.status] ?? 0) + 1;
        const completed = byStatus["completed"] ?? 0;
        const failed = byStatus["failed"] ?? 0;
        const cancelled = byStatus["cancelled"] ?? 0;
        const terminal = completed + failed + cancelled;
        await progress({ step: "sync", total: childIds.length, completed, failed, cancelled });
        if (terminal >= childIds.length) {
          result.syncCompleted = completed;
          result.syncFailed = failed;
          result.syncCancelled = cancelled;
          break;
        }
        await new Promise((r) => setTimeout(r, this.pollMs));
      }
      result.syncRan = true;
      await log("info", `Sync pass done: ${result.syncCompleted} ok, ${result.syncFailed} failed, ${result.syncCancelled} cancelled`);
    } else {
      await log("info", "Daily pipeline: skipSync — smart-filter retry pass only");
    }

    await throwIfCancelled();

    // ── Step 3: daily snapshot (idempotent per date) ──────────────────────
    if (!skipSync) {
      result.snapshots = await this.snapshots.upsertForDate(result.snapshotDate);
      await log("info", `Snapshotted ${result.snapshots} companies for ${result.snapshotDate}`);
    }

    // ── Step 4: LLM smart filter, gated on OpenCode reachability ──────────
    const llm = OpenCodeClient.fromConfig(this.config);
    result.llmReachable = await llm.isReachable();
    if (!result.llmReachable) {
      await log("warn", "OpenCode unreachable — smart filter skipped; hourly catch-up will retry");
      return result;
    }

    await progress({ step: "smart-filter" });
    const { runId } = await this.queue.enqueueTask("smart-filter-accepted", {}, { dedupeKey: "smart-filter-accepted" });
    await log("info", `Enqueued smart-filter-accepted (run ${runId})`);

    while (true) {
      if (await isCancelled()) {
        await log("warn", "Daily pipeline cancelled while waiting for smart filter");
        throw new Error("Task cancelled");
      }
      const run = await this.taskRuns.getById(runId);
      if (!run) break;
      if (run.status === "completed") {
        result.smartFilterRan = true;
        try {
          result.smartFilter = run.resultJson ? JSON.parse(run.resultJson) : null;
        } catch {
          result.smartFilter = null;
        }
        break;
      }
      if (run.status === "failed" || run.status === "cancelled") {
        await log("warn", `smart-filter-accepted ended ${run.status}: ${run.error ?? "no error"}`);
        break;
      }
      await new Promise((r) => setTimeout(r, this.pollMs));
    }

    await log("info", `Daily pipeline done (smartFilterRan=${result.smartFilterRan})`);
    return result;
  }
}

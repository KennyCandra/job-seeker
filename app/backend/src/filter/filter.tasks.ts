import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TaskRegistry } from "../tasks/task-registry";
import { TaskQueueService } from "../tasks/task-queue.service";
import { TaskRunsService } from "../tasks/task-runs.service";
import { JobsRepository, JobFiltersRepository } from "../database/repositories";
import { FilterService } from "./filter.service";
import { SearchConfigService } from "../config/search-config.service";
import type { EnvConfig } from "../config/env";
import type { TaskHandlerContext } from "../tasks/types";

@Injectable()
export class FilterTasksService implements OnModuleInit {
  private readonly logger = new Logger(FilterTasksService.name);

  constructor(
    private readonly registry: TaskRegistry,
    private readonly queue: TaskQueueService,
    private readonly runs: TaskRunsService,
    private readonly jobs: JobsRepository,
    private readonly filter: FilterService,
    private readonly config: SearchConfigService,
    private readonly jobFiltersRepo: JobFiltersRepository,
    private readonly env: ConfigService<EnvConfig>,
  ) {}

  onModuleInit() {
    this.registry.register("normal-filter-batch", this.normalFilterBatch.bind(this));
    this.registry.register("normal-filter-job", this.normalFilterJob.bind(this));
    this.registry.register("smart-filter-accepted", this.smartFilterAccepted.bind(this));
    this.registry.register("smart-filter-job", this.smartFilterJob.bind(this));
  }

  private async normalFilterBatch(ctx: TaskHandlerContext): Promise<unknown> {
    const { log, payload, progress, isCancelled, throwIfCancelled } = ctx;
    await throwIfCancelled();

    const { limit, force, companySlug, includeClosed } = payload as Record<string, unknown>;
    const { candidates, skipped } = await this.filter.getNormalFilterCandidates({
      limit: Number(limit) || 0,
      force: Boolean(force),
      companySlug: companySlug ? String(companySlug) : undefined,
      includeClosed: Boolean(includeClosed),
    });

    await log("info", `Normal filter batch: ${candidates.length} candidates (${skipped} skipped)`);

    if (candidates.length === 0) {
      await progress({ total: 0, queued: 0, running: 0, completed: 0, failed: 0, cancelled: 0, accepted: 0, rejected: 0, skipped });
      return { total: 0, completed: 0, failed: 0, cancelled: 0, accepted: 0, rejected: 0, skipped, failedJobIds: [] };
    }

    const childEntries: Array<{ runId: string; jobId: string; companyName: string }> = [];

    for (const c of candidates) {
      await throwIfCancelled();
      const { runId } = await this.queue.enqueueTask(
        "normal-filter-job",
        { jobId: c.jobId, force: Boolean(force), includeClosed: Boolean(includeClosed) },
        {
          force: Boolean(force),
          dedupeKey: `normal-filter-job:${c.jobId}:${c.contentHash || "nohash"}`,
          attempts: 2,
          backoff: { type: "exponential", delay: 10000 },
        },
      );
      childEntries.push({ runId, jobId: c.jobId, companyName: c.companyName });
      await log("info", `Enqueued filter for ${c.jobId} (${c.companyName} - ${c.title}) → ${runId}`);
    }

    const total = childEntries.length;
    const failedJobIds: string[] = [];
    let completed = 0, failed = 0, cancelled = 0, running = 0, queued = 0, accepted = 0, rejected = 0, skippedChildren = 0;

    while (true) {
      if (await isCancelled()) {
        await log("warn", "normal-filter-batch cancelled — cancelling children");
        for (const entry of childEntries) {
          try { await this.queue.cancelTask(entry.runId); } catch {}
        }
        break;
      }

      completed = 0; failed = 0; cancelled = 0; running = 0; queued = 0; accepted = 0; rejected = 0; skippedChildren = 0;
      failedJobIds.length = 0;

      for (const entry of childEntries) {
        const child = await this.runs.get(entry.runId);
        if (!child) continue;
        if (child.status === "completed") {
          completed++;
          if (child.resultJson) {
            try {
              const r = JSON.parse(child.resultJson);
              if (r.skipped === true) skippedChildren++;
              else if (r.verdict === "accept") accepted++;
              else if (r.verdict === "reject") rejected++;
            } catch {}
          }
        } else if (child.status === "failed") {
          failed++; failedJobIds.push(entry.jobId);
        } else if (child.status === "cancelled") {
          cancelled++;
        } else if (child.status === "running") {
          running++;
        } else if (child.status === "queued") {
          queued++;
        }
      }

      await progress({ total, queued, running, completed, failed, cancelled, accepted, rejected, skipped, skippedChildren });

      if (completed + failed + cancelled === total) break;
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    return { total, completed, failed, cancelled, accepted, rejected, skipped, skippedChildren, failedJobIds };
  }

  private async normalFilterJob(ctx: TaskHandlerContext): Promise<unknown> {
    const { log, payload, throwIfCancelled } = ctx;
    const jobId = String(payload.jobId || "");
    const force = Boolean(payload.force);
    const includeClosed = Boolean(payload.includeClosed);

    if (!jobId) throw new Error("jobId is required");

    const jobRow = await this.jobs.getById(jobId);
    if (!jobRow) throw new Error(`Job not found: ${jobId}`);

    if (!includeClosed && jobRow.status === "closed") {
      await log("warn", `Job ${jobId} is closed — skipping`);
      return { jobId, skipped: true, reason: "closed" };
    }

    if (!force) {
      const existing = await this.jobFiltersRepo.getByJobId(jobId);
      if (existing.some((f: any) => f.promptVersion === "normal-filter-scoring-v1" && f.contentHash === jobRow.contentHash)) {
        await log("info", `Job ${jobId} already has the current keyword prefilter — skipping`);
        return { jobId, skipped: true, reason: "already-filtered-current-version" };
      }
    }

    await throwIfCancelled();

    const config = await this.config.load();
    const lite = this.filter.toLiteJob(jobRow);
    const result = this.filter.normalFilterJob(lite, config);
    await this.filter.saveNormalFilterResult(jobId, jobRow.contentHash, result);

    await log("info", `Job ${jobId}: ${result.filter.verdict} score=${result.filter.score}`);
    return { jobId, skipped: false, verdict: result.filter.verdict, score: result.filter.score };
  }

  private async smartFilterAccepted(ctx: TaskHandlerContext): Promise<unknown> {
    const { log, payload, throwIfCancelled, progress } = ctx;
    const force = payload.force === true;
    const allCandidateIds = await this.jobFiltersRepo.getSmartFilterCandidateJobIds(force);

    // Cap how many jobs a single run sends to the LLM so we never blast the whole
    // accepted pool in one shot. Because getSmartFilterCandidateJobIds already
    // excludes jobs that have a smart filter, consecutive runs drain the backlog
    // automatically — each run just takes the next slice. limit <= 0 = unlimited.
    const envLimit = this.env.get("SMART_FILTER_BATCH_LIMIT", { infer: true }) ?? 0;
    const rawLimit = payload.limit != null ? Number(payload.limit) : envLimit;
    const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : 0;
    const candidateIds = limit > 0 ? allCandidateIds.slice(0, limit) : allCandidateIds;
    const remaining = Math.max(0, allCandidateIds.length - candidateIds.length);

    const config = await this.config.load();
    const summary = {
      candidates: allCandidateIds.length,
      batch: candidateIds.length,
      remaining,
      limit,
      processed: 0,
      accepted: 0,
      rejected: 0,
      failed: 0,
      missing: 0,
    };

    await log(
      "info",
      `Smart filter accepted: ${allCandidateIds.length} pending (open, latest verdict accept${force ? ", force" : ""}); ` +
        `processing ${candidateIds.length} this run${limit > 0 ? ` (cap ${limit})` : ""}, ${remaining} remaining`,
    );

    for (const [index, jobId] of candidateIds.entries()) {
      await throwIfCancelled();
      if (index % 25 === 0) await progress({ current: index, total: candidateIds.length, processed: summary.processed });

      const jobRow = await this.jobs.getById(jobId);
      if (!jobRow) { summary.missing += 1; continue; }

      const lite = this.filter.toLiteJob(jobRow);
      await log("info", `Smart filtering job=${jobRow.id} company=${jobRow.companyName}`);
      try {
        const result = await this.filter.filterJob(lite, config.targetCompanies);
        if (!result) { summary.failed += 1; continue; }
        await this.filter.saveSmartFilterResult(jobRow.id, jobRow.contentHash, result);
        summary.processed += 1;
        if (result.filter.verdict === "accept") summary.accepted += 1;
        else summary.rejected += 1;
        await log("info", `Job ${jobRow.id}: ${result.filter.verdict} score=${result.filter.score}`);
      } catch (err: any) {
        summary.failed += 1;
        await log("error", `Job ${jobRow.id} failed: ${err?.message ?? err}`);
      }
    }

    await progress({ current: candidateIds.length, total: candidateIds.length, processed: summary.processed });
    return summary;
  }

  private async smartFilterJob(ctx: TaskHandlerContext): Promise<unknown> {
    const { log, payload, throwIfCancelled } = ctx;
    const jobId = String(payload.jobId || "");
    const force = Boolean(payload.force);

    if (!jobId) throw new Error("jobId is required");
    const jobRow = await this.jobs.getById(jobId);
    if (!jobRow) throw new Error(`Job not found: ${jobId}`);

    if (!force) {
      const existing = await this.jobFiltersRepo.getByJobId(jobId);
      if (existing.some((f: any) => f.promptVersion === "smart-filter-v1" || String(f.id).startsWith("smart-filter-"))) {
        await log("info", `Job ${jobId} already has a smart filter — skipping`);
        return { jobId, skipped: true, reason: "already-smart-filtered" };
      }
    }

    await throwIfCancelled();
    const config = await this.config.load();
    const lite = this.filter.toLiteJob(jobRow);
    const result = await this.filter.filterJob(lite, config.targetCompanies);
    if (!result) throw new Error("Smart filter returned no result");
    await this.filter.saveSmartFilterResult(jobId, jobRow.contentHash, result);
    await log("info", `Smart filter done: ${result.filter.verdict} score=${result.filter.score}`);
    return { jobId, verdict: result.filter.verdict, score: result.filter.score };
  }
}

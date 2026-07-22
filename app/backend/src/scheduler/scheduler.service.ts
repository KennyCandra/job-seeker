import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SchedulerRegistry } from "@nestjs/schedule";
import { CronJob } from "cron";
import { TaskQueueService } from "../tasks/task-queue.service";
import { TaskRunsRepository } from "../database/repositories";
import { decideCatchUp } from "./catch-up";
import type { EnvConfig } from "../config/env";

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly registry: SchedulerRegistry,
    private readonly taskQueue: TaskQueueService,
    private readonly taskRuns: TaskRunsRepository,
    private readonly config: ConfigService<EnvConfig>,
  ) {}

  onModuleInit(): void {
    const syncHours = this.config.get("POLL_INTERVAL_HOURS", { infer: true }) ?? 0;
    if (syncHours > 0) {
      this.logger.log(`Scheduled sync enabled: every ${syncHours}h`);
      this.registry.addInterval("scheduled-sync-all", setInterval(() => void this.tickSync(), syncHours * 3600_000));
      void this.tickSync();
    }

    const discoveryHours = this.config.get("DISCOVERY_INTERVAL_HOURS", { infer: true }) ?? 0;
    if (discoveryHours > 0) {
      this.logger.log(`Scheduled discovery enabled: every ${discoveryHours}h`);
      this.registry.addInterval("scheduled-discovery", setInterval(() => void this.tickDiscovery(), discoveryHours * 3600_000));
      void this.tickDiscovery();
    }

    const pipelineEnabled = this.config.get("DAILY_PIPELINE_ENABLED", { infer: true }) ?? false;
    if (pipelineEnabled) {
      this.logger.log("Daily pipeline enabled: hourly catch-up active");
      this.registry.addInterval(
        "daily-pipeline-catchup",
        setInterval(() => void this.tickDailyPipeline(), 3600_000),
      );
      void this.tickDailyPipeline(); // boot-time tick: covers "machine was off all day"

      const hour = this.config.get("DAILY_PIPELINE_HOUR", { infer: true });
      if (hour != null) {
        this.logger.log(`Daily pipeline cron: daily at ${hour}:00`);
        const job = new CronJob(`0 0 ${hour} * * *`, () => void this.enqueueDailyPipeline({}));
        this.registry.addCronJob("daily-pipeline-cron", job);
        job.start();
      }
    }

    // Smart-filter drain: enqueue one capped batch on a cadence so the accepted
    // backlog drains a slice at a time instead of in a single unbounded run. The
    // "smart-filter-accepted" dedupeKey prevents a new batch from stacking while
    // one is still active.
    const drainMin = this.config.get("SMART_FILTER_DRAIN_INTERVAL_MIN", { infer: true }) ?? 0;
    if (drainMin > 0) {
      this.logger.log(`Smart-filter drain enabled: one capped batch every ${drainMin}m`);
      this.registry.addInterval(
        "smart-filter-drain",
        setInterval(() => void this.tickSmartFilterDrain(), drainMin * 60_000),
      );
      void this.tickSmartFilterDrain();
    }
  }

  private async tickSmartFilterDrain(): Promise<void> {
    try {
      const { runId } = await this.taskQueue.enqueueTask(
        "smart-filter-accepted",
        {},
        { dedupeKey: "smart-filter-accepted" },
      );
      this.logger.log(`Smart-filter drain batch enqueued (run ${runId})`);
    } catch (err: any) {
      this.logger.error(`Failed to enqueue smart-filter drain: ${err?.message ?? err}`);
    }
  }

  private async tickSync(): Promise<void> {
    try {
      const { runId } = await this.taskQueue.enqueueTask(
        "sync-all-jobs",
        { filter: true },
        { dedupeKey: "scheduled:sync-all" },
      );
      this.logger.log(`Scheduled sync-all-jobs enqueued (run ${runId})`);
    } catch (err: any) {
      this.logger.error(`Failed to enqueue scheduled sync: ${err?.message ?? err}`);
    }
  }

  private async tickDiscovery(): Promise<void> {
    try {
      const { runId } = await this.taskQueue.enqueueTask(
        "discover-companies",
        {},
        { dedupeKey: "scheduled:discovery" },
      );
      this.logger.log(`Scheduled discover-companies enqueued (run ${runId})`);
    } catch (err: any) {
      this.logger.error(`Failed to enqueue scheduled discovery: ${err?.message ?? err}`);
    }
  }

  private async tickDailyPipeline(): Promise<void> {
    try {
      const catchupHours = this.config.get("DAILY_PIPELINE_CATCHUP_HOURS", { infer: true }) ?? 20;
      const runs = await this.taskRuns.getRecentCompletedByType("daily-pipeline", 20);
      const action = decideCatchUp(runs, new Date(), catchupHours);
      if (action === "none") return;
      await this.enqueueDailyPipeline(action === "smart-only" ? { skipSync: true } : {});
    } catch (err: any) {
      this.logger.error(`Daily pipeline catch-up failed: ${err?.message ?? err}`);
    }
  }

  private async enqueueDailyPipeline(payload: Record<string, unknown>): Promise<void> {
    const { runId } = await this.taskQueue.enqueueTask("daily-pipeline", payload, {
      dedupeKey: "daily-pipeline",
    });
    this.logger.log(`Daily pipeline enqueued (run ${runId}${payload.skipSync ? ", smart-only" : ""})`);
  }
}

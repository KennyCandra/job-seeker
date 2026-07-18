import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SchedulerRegistry } from "@nestjs/schedule";
import { TaskQueueService } from "../tasks/task-queue.service";
import type { EnvConfig } from "../config/env";

@Injectable()
export class SchedulerService implements OnModuleInit {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly registry: SchedulerRegistry,
    private readonly taskQueue: TaskQueueService,
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
}

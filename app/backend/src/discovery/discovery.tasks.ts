import { Injectable, OnModuleInit } from "@nestjs/common";
import { TaskRegistry } from "../tasks/task-registry";
import { TaskQueueService } from "../tasks/task-queue.service";
import { TaskRunsService } from "../tasks/task-runs.service";
import { CompaniesRepository } from "../database/repositories";
import { DiscoveryService } from "./discovery.service";
import type { TaskHandlerContext } from "../tasks/types";

@Injectable()
export class DiscoveryTasksService implements OnModuleInit {
  constructor(
    private readonly registry: TaskRegistry,
    private readonly queue: TaskQueueService,
    private readonly runs: TaskRunsService,
    private readonly companies: CompaniesRepository,
    private readonly discovery: DiscoveryService,
  ) {}

  onModuleInit() {
    this.registry.register("discover-companies", this.discoverCompanies.bind(this));
    this.registry.register("ln-companies", this.discoverCompanies.bind(this));
    this.registry.register("discover-fetch-filter", this.discoverFetchFilter.bind(this));
    this.registry.register("ln-fetch-filter", this.discoverFetchFilter.bind(this));
  }

  private async discoverCompanies(ctx: TaskHandlerContext): Promise<unknown> {
    const { log, throwIfCancelled } = ctx;
    await throwIfCancelled();
    const result = await this.discovery.discover((pl) => log("info", `[discovery] ${pl.type}: ${pl.message}`));
    await throwIfCancelled();
    return {
      source: result.source,
      found: result.found,
      added: result.added,
      updated: result.updated,
      queries: result.queries,
      companies: result.companies,
    };
  }

  private async discoverFetchFilter(ctx: TaskHandlerContext): Promise<unknown> {
    const { log, progress, isCancelled, throwIfCancelled } = ctx;
    await throwIfCancelled();
    await log("info", "Starting company discovery...");
    const discovery = await this.discovery.discover((pl) => log("info", `[discovery] ${pl.type}: ${pl.message}`));
    await log("info", `Discovery done: ${discovery.added} new companies`);

    const allCompanies = await this.companies.getActive();
    await log("info", `Fan-out sync+filter for ${allCompanies.length} active companies`);

    if (allCompanies.length === 0) {
      await progress({ total: 0, queued: 0, running: 0, completed: 0, failed: 0, cancelled: 0 });
      return { discovered: discovery.added, total: 0, queued: 0, running: 0, completed: 0, failed: 0, cancelled: 0, failedSlugs: [] };
    }

    const childEntries: Array<{ runId: string; companySlug: string; companyName: string }> = [];
    for (const company of allCompanies) {
      await throwIfCancelled();
      const { runId } = await this.queue.enqueueTask(
        "sync-company",
        { companySlug: company.slug, filter: true },
        { dedupeKey: `sync-company:${company.slug}:true` },
      );
      childEntries.push({ runId, companySlug: company.slug, companyName: company.name });
      await log("info", `Enqueued sync+filter for ${company.slug} → ${runId}`);
    }

    const total = childEntries.length;
    const failedSlugs: string[] = [];
    let completed = 0, failed = 0, cancelled = 0, running = 0, queued = 0;

    while (true) {
      if (await isCancelled()) {
        await log("warn", "discover-fetch-filter cancelled — cancelling children");
        for (const entry of childEntries) {
          try { await this.queue.cancelTask(entry.runId); } catch {}
        }
        break;
      }
      completed = 0; failed = 0; cancelled = 0; running = 0; queued = 0; failedSlugs.length = 0;
      for (const entry of childEntries) {
        const child = await this.runs.get(entry.runId);
        if (!child) continue;
        if (child.status === "completed") completed++;
        else if (child.status === "failed") { failed++; failedSlugs.push(entry.companySlug); }
        else if (child.status === "cancelled") cancelled++;
        else if (child.status === "running") running++;
        else if (child.status === "queued") queued++;
      }
      await progress({ total, queued, running, completed, failed, cancelled });
      if (completed + failed + cancelled === total) break;
      await new Promise((r) => setTimeout(r, 2000));
    }

    return { discovered: discovery.added, total, queued, running, completed, failed, cancelled, failedSlugs };
  }
}

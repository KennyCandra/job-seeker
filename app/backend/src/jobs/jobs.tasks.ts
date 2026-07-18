import { Injectable, OnModuleInit } from "@nestjs/common";
import { TaskRegistry } from "../tasks/task-registry";
import { TaskQueueService } from "../tasks/task-queue.service";
import { JobsIngestionService } from "./ingestion.service";
import { CompaniesRepository, JobsRepository } from "../database/repositories";
import { FilterService } from "../filter/filter.service";
import { SearchConfigService } from "../config/search-config.service";
import { AppException } from "../common/errors";
import type { AtsPlatform } from "../shared/types";
import type { TaskHandlerContext } from "../tasks/types";

@Injectable()
export class JobsTasksService implements OnModuleInit {
  constructor(
    private readonly registry: TaskRegistry,
    private readonly ingestion: JobsIngestionService,
    private readonly companies: CompaniesRepository,
    private readonly jobs: JobsRepository,
    private readonly taskQueue: TaskQueueService,
    private readonly filter: FilterService,
    private readonly searchConfig: SearchConfigService,
  ) {}

  onModuleInit() {
    this.registry.register("sync-all-jobs", this.syncAllJobs.bind(this));
    this.registry.register("sync-company", this.syncCompany.bind(this));
    this.registry.register("refetch-job", this.refetchJob.bind(this));
    this.registry.register("detect-migration", this.detectMigration.bind(this));
  }

  private async syncAllJobs(ctx: TaskHandlerContext): Promise<unknown> {
    const { payload, log } = ctx;
    const filter = payload?.filter === true;
    const companies = await this.companies.getActive();
    await log("info", `Fanning out sync for ${companies.length} active companies${filter ? " (with post-sync filtering)" : ""}`);

    const enqueued: string[] = [];
    for (const company of companies) {
      const { runId } = await this.taskQueue.enqueueTask(
        "sync-company",
        { companySlug: company.slug, filter },
        { dedupeKey: `sync-company:${company.slug}:${filter}` },
      );
      enqueued.push(company.slug);
      await log("info", `Enqueued sync-company for ${company.slug} (run ${runId})`);
    }

    return { enqueued: enqueued.length, companies: enqueued };
  }

  private async syncCompany(ctx: TaskHandlerContext): Promise<unknown> {
    const { payload, log, throwIfCancelled } = ctx;
    const companySlug = String(payload.companySlug || "");
    if (!companySlug) throw new AppException(400, "companySlug is required");
    const company = await this.companies.getBySlug(companySlug);
    if (!company) throw new AppException(404, `Company not found: ${companySlug}`);
    await log("info", `Syncing company ${companySlug}`);

    try {
      const result = await this.ingestion.syncCompany(company, ctx);
      const summary: Record<string, unknown> = { ...result, filtered: 0, accepted: 0 };

      if (payload.filter === true) {
        const candidateIds = [...result.newJobIds, ...result.changedJobIds];
        await log("info", `Running normal filter on ${candidateIds.length} candidates`);
        if (candidateIds.length > 0) {
          const config = await this.searchConfig.load();
          let accepted = 0;
          for (const [index, jobId] of candidateIds.entries()) {
            await throwIfCancelled();
            const jobRow = await this.jobs.getById(jobId);
            if (!jobRow) continue;
            const lite = this.filter.toLiteJob(jobRow);
            const filterResult = this.filter.normalFilterJob(lite, config);
            await this.filter.saveNormalFilterResult(jobId, jobRow.contentHash, filterResult, index);
            if (filterResult.filter.verdict === "accept") accepted += 1;
            await log("info", `Job ${jobId}: ${filterResult.filter.verdict} score=${filterResult.filter.score}`);
          }
          summary.filtered = candidateIds.length;
          summary.accepted = accepted;
        }
      }

      return summary;
    } catch (err: any) {
      const message = err?.message ?? String(err);
      if (err?.status === 404) {
        await this.companies.deactivate(companySlug);
        await log("warn", `Company ${companySlug} returned 404 — deactivated, queuing ATS migration check`);
        await this.taskQueue.enqueueTask(
          "detect-migration",
          { companySlug, prevAts: company.ats },
          { dedupeKey: `detect-migration:${companySlug}` },
        );
      } else {
        await this.companies.updateFetchError(companySlug, message);
        await log("error", `Sync failed for ${companySlug}: ${message}`);
      }
      throw err;
    }
  }

  private async refetchJob(ctx: TaskHandlerContext): Promise<unknown> {
    const { payload, log } = ctx;
    const jobId = String(payload.jobId || "");
    await log("info", `Refetching job ${jobId}`);
    return this.ingestion.refetchJob(jobId, ctx);
  }

  private async detectMigration(ctx: TaskHandlerContext): Promise<unknown> {
    const { payload, log } = ctx;
    const companySlug = String(payload.companySlug || "");
    if (!companySlug) throw new AppException(400, "companySlug is required");
    const prevAts = (payload.prevAts as AtsPlatform) || "custom";
    await log("info", `Detecting ATS migration for ${companySlug} (previously ${prevAts})`);
    return this.ingestion.detectMigration(companySlug, prevAts, ctx);
  }
}

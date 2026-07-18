import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JobsRepository, ApplicationsRepository, JobFiltersRepository, CompaniesRepository, JobDocumentsRepository } from "../database/repositories";
import { TaskRegistry } from "../tasks/task-registry";
import { TaskQueueService } from "../tasks/task-queue.service";
import { FilterService } from "../filter/filter.service";
import { GeneratorService } from "../documents/generator.service";
import { AppException } from "../common/errors";
import type { TaskHandlerContext } from "../tasks/types";
import { readText } from "../shared/utils";
import { SKILLS_DIR, JOBS_DIR, resolveContainedPath } from "../common/paths";
import { OpenCodeClient } from "../shared/llm";
import { existsSync, readFileSync } from "fs";
import type { JobRecordLite } from "../filter/filter.service";
import type { EnvConfig } from "../config/env";

export const APPLICATION_STATUSES = [
  "approved",
  "ready",
  "applied",
  "interviewing",
  "offer",
  "rejected",
  "ghosted",
  "withdrawn",
] as const;
export type AppStatus = (typeof APPLICATION_STATUSES)[number];

@Injectable()
export class ApplicationsService {
  constructor(
    private readonly jobs: JobsRepository,
    private readonly applications: ApplicationsRepository,
    private readonly jobFilters: JobFiltersRepository,
    private readonly companies: CompaniesRepository,
    private readonly documents: JobDocumentsRepository,
    private readonly generator: GeneratorService,
  ) {}

  async list(cursor?: string) {
    return this.applications.listCursor(cursor);
  }

  async updateStatus(jobId: string, status: string) {
    if (!APPLICATION_STATUSES.includes(status as AppStatus)) {
      throw new AppException(400, `Invalid status: ${status}`);
    }
    await this.applications.updateStatus(jobId, status);
    return { ok: true };
  }

  async remove(jobId: string) {
    await this.applications.delete(jobId);
    return { ok: true };
  }

  async downloadPdf(jobId: string): Promise<{ filePath: string; fileName: string }> {
    const appRow = await this.applications.getByJobId(jobId);
    if (!appRow) throw new AppException(404, "Application not found");
    const cv = (await this.documents.getByJobId(jobId)).find((d) => d.type === "cv" && d.filePath);
    if (!cv) throw new AppException(404, "No PDF found");
    const filePath = cv.filePath ? resolveContainedPath(JOBS_DIR, cv.filePath) : null;
    if (!filePath || !existsSync(filePath)) throw new AppException(404, "PDF file not found");
    return { filePath, fileName: filePath.split(/[\\/]/).pop() || "cv.pdf" };
  }

  async generate(jobId: string, force = false) {
    const appRow = await this.applications.getByJobId(jobId);
    if (!appRow) throw new AppException(404, "Application not found");
    const result = await this.generator.generate(jobId, "cv", force);
    const cv = (await this.documents.getByJobId(jobId)).find((d) => d.type === "cv" && d.filePath);
    const pdfPath = cv ? `/api/applications/${jobId}/pdf` : null;
    return { exists: result.exists, pdfPath, document: result.document };
  }
}

@Injectable()
export class SavedJobsService {
  private readonly client: OpenCodeClient;

  constructor(
    private readonly config: ConfigService<EnvConfig>,
    private readonly jobs: JobsRepository,
    private readonly applications: ApplicationsRepository,
    private readonly jobFilters: JobFiltersRepository,
    private readonly companies: CompaniesRepository,
    private readonly filter: FilterService,
  ) {
    this.client = OpenCodeClient.fromConfig(this.config);
  }

  async getSavedJobs(limit?: unknown) {
    const all = await this.jobs.getAll(this.parseLimit(limit));
    const processedIds = new Set(await this.applications.getProcessedJobIdsFor(all.map((j) => j.id)));
    return all.map((j) => ({ ...j, processed: processedIds.has(j.id) }));
  }

  async getSavedJobsByCompany(company: string, limit?: unknown) {
    const list = await this.jobs.getByCompany(company, this.parseLimit(limit));
    const processedIds = new Set(await this.applications.getProcessedJobIdsFor(list.map((j) => j.id)));
    return list.map((j) => ({ ...j, processed: processedIds.has(j.id) }));
  }

  async filterSavedJob(companySlug: string, jobId: string) {
    const saved = await this.jobs.get(companySlug, jobId);
    if (!saved) throw new AppException(404, "Saved job not found");
    const company = await this.companies.getBySlug(companySlug);
    const lite: JobRecordLite = {
      id: jobId,
      site: saved.ats || "",
      title: saved.title,
      company: company?.name || companySlug,
      location: saved.location,
      url: saved.url,
      description: saved.description,
    };
    const filterMd = readText(`${SKILLS_DIR}/job_filter.md`);
    const result = await this.filter.filterJob(lite);
    if (!result) return { accepted: false, error: "Filter failed" };
    await this.jobFilters.save({
      id: `filter-${jobId}-${Date.now()}`,
      jobId,
      verdict: result.filter.verdict,
      score: result.filter.score,
      reasons: result.filter.reasons,
      mustHaveHits: result.filter.must_have_hits,
      missingItems: result.filter.missing,
    });
    return {
      accepted: result.filter.verdict === "accept",
      score: result.filter.score,
      reasons: result.filter.reasons,
      mustHaveHits: result.filter.must_have_hits,
      missing: result.filter.missing,
    };
  }

  private parseLimit(value: unknown): number {
    const limit = Number(value);
    return Number.isFinite(limit) ? Math.min(100, Math.max(1, Math.floor(limit))) : 100;
  }
}

@Injectable()
export class ApplicationsTasksService implements OnModuleInit {
  private readonly logger = new Logger(ApplicationsTasksService.name);

  constructor(
    private readonly registry: TaskRegistry,
    private readonly jobs: JobsRepository,
    private readonly applications: ApplicationsRepository,
    private readonly jobFilters: JobFiltersRepository,
    private readonly queue: TaskQueueService,
  ) {}

  onModuleInit() {
    this.registry.register("create-application", this.createApplication.bind(this));
  }

  private async createApplication(ctx: TaskHandlerContext): Promise<unknown> {
    const { log, payload, throwIfCancelled } = ctx;
    const jobId = String(payload.jobId || "");
    if (!jobId) throw new AppException(400, "jobId is required");
    const jobRow = await this.jobs.getById(jobId);
    if (!jobRow) throw new AppException(404, `Job not found: ${jobId}`);
    const existing = await this.applications.getByJobId(jobId);
    if (existing) {
      await log("info", `Application already exists for job ${jobId}`);
      return { created: false, application: existing };
    }
    await throwIfCancelled();
    const filters = await this.jobFilters.getByJobId(jobId);
    const score = filters.length > 0 ? filters[0].score : 0;
    await this.applications.saveAcceptedJob(jobId, score, "approved");
    const app = await this.applications.getByJobId(jobId);
    await log("info", `Application created for job ${jobId}`);
    return { created: true, application: app };
  }
}

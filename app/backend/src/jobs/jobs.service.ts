import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JobsRepository, CompaniesRepository } from "../database/repositories";
import { JobsIngestionService } from "./ingestion.service";
import { TaskQueueService } from "../tasks/task-queue.service";
import { OpenCodeClient } from "../shared/llm";
import { buildExtractPrompt } from "../shared/prompts";
import { AppException } from "../common/errors";
import type { EnvConfig } from "../config/env";

export type JobsSearchQuery = {
  page?: string;
  pageSize?: string;
  search?: string;
  company?: string;
  status?: string;
  verdict?: string;
  smartVerdict?: string;
  minScore?: string;
  fetchedWithinHours?: string;
};

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);
  private readonly client: OpenCodeClient;

  constructor(
    private readonly config: ConfigService<EnvConfig>,
    private readonly jobs: JobsRepository,
    private readonly companies: CompaniesRepository,
    private readonly ingestion: JobsIngestionService,
    private readonly queue: TaskQueueService,
  ) {
    this.client = OpenCodeClient.fromConfig(this.config);
  }

  search(input: JobsSearchQuery) {
    return this.jobs.search({
      page: Number(input.page) || 1,
      pageSize: Number(input.pageSize) || 50,
      search: String(input.search || ""),
      companyName: String(input.company || ""),
      status: String(input.status || ""),
      verdict: String(input.verdict || ""),
      smartVerdict: String(input.smartVerdict || ""),
      minScore: Number(input.minScore) || 0,
      fetchedWithinHours: Number(input.fetchedWithinHours) || 0,
    });
  }

  getDetail(jobId: string) {
    return this.jobs.getJobDetail(jobId);
  }

  async manualFromText(text: string): Promise<{ job: any; companySlug: string }> {
    if (!text || text.trim().length < 20) {
      throw new AppException(400, "Pasted job text is too short");
    }
    const prompt = buildExtractPrompt(text);
    const parsed = await this.client.structured(prompt.system, prompt.user);
    const title = String(parsed?.title || "").trim();
    const companyName = String(parsed?.company || "").trim();
    if (!title) {
      throw new AppException(400, "Could not extract a job title from the pasted text");
    }
    const companySlug = companyName ? slugify(companyName) : "manual";
    const result = await this.ingestion.createManualJob({
      companySlug,
      title,
      location: String(parsed?.location || ""),
      url: String(parsed?.url || ""),
      description: String(parsed?.description || ""),
    });
    const detail = await this.getDetail(result.jobId);
    return { job: detail, companySlug: result.companySlug };
  }

  refetch(jobId: string) {
    return this.queue.enqueueTask("refetch-job", { jobId }, { dedupeKey: `refetch-job:${jobId}` });
  }

  filterCandidates(payload: { limit?: number; force?: boolean; companySlug?: string; includeClosed?: boolean }) {
    return this.queue.enqueueTask(
      "normal-filter-batch",
      {
        limit: Number.isFinite(Number(payload.limit)) ? Number(payload.limit) : 0,
        companySlug: payload.companySlug || undefined,
        includeClosed: Boolean(payload.includeClosed),
        force: Boolean(payload.force),
      },
      {
        force: Boolean(payload.force),
        dedupeKey: `normal-filter-batch:${payload.companySlug || "all"}:${Boolean(payload.includeClosed)}:${Number(payload.limit) || 0}`,
      },
    );
  }

  smartFilterAccepted(force?: boolean, limit?: number) {
    const payload: { force: boolean; limit?: number } = { force: Boolean(force) };
    if (limit != null) payload.limit = Number(limit);
    return this.queue.enqueueTask("smart-filter-accepted", payload, { force: Boolean(force), dedupeKey: "smart-filter-accepted" });
  }

  filterJob(jobId: string) {
    return this.queue.enqueueTask("normal-filter-job", { jobId }, { dedupeKey: `normal-filter-job:${jobId}` });
  }

  smartFilterJob(jobId: string) {
    return this.queue.enqueueTask("smart-filter-job", { jobId }, { dedupeKey: `smart-filter-job:${jobId}` });
  }

  createApplication(jobId: string) {
    return this.queue.enqueueTask("create-application", { jobId }, { dedupeKey: `create-application:${jobId}` });
  }
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "manual";
}

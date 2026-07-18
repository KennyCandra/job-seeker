import { ConfigService } from "@nestjs/config";
import { JobsRepository, CompaniesRepository } from "../database/repositories";
import { JobsIngestionService } from "./ingestion.service";
import { TaskQueueService } from "../tasks/task-queue.service";
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
export declare class JobsService {
    private readonly config;
    private readonly jobs;
    private readonly companies;
    private readonly ingestion;
    private readonly queue;
    private readonly logger;
    private readonly client;
    constructor(config: ConfigService<EnvConfig>, jobs: JobsRepository, companies: CompaniesRepository, ingestion: JobsIngestionService, queue: TaskQueueService);
    search(input: JobsSearchQuery): Promise<import("../database/repositories/jobs.repository").JobSearchResult>;
    getDetail(jobId: string): Promise<import("../database/queries/job-detail.query").JobDetailReadModel | null>;
    manualFromText(text: string): Promise<{
        job: any;
        companySlug: string;
    }>;
    refetch(jobId: string): Promise<{
        runId: string;
        bullJobId: string | undefined;
        status: string;
    }>;
    filterCandidates(payload: {
        limit?: number;
        force?: boolean;
        companySlug?: string;
        includeClosed?: boolean;
    }): Promise<{
        runId: string;
        bullJobId: string | undefined;
        status: string;
    }>;
    smartFilterAccepted(force?: boolean): Promise<{
        runId: string;
        bullJobId: string | undefined;
        status: string;
    }>;
    filterJob(jobId: string): Promise<{
        runId: string;
        bullJobId: string | undefined;
        status: string;
    }>;
    smartFilterJob(jobId: string): Promise<{
        runId: string;
        bullJobId: string | undefined;
        status: string;
    }>;
    createApplication(jobId: string): Promise<{
        runId: string;
        bullJobId: string | undefined;
        status: string;
    }>;
}

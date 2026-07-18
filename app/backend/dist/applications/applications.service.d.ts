import { OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JobsRepository, ApplicationsRepository, JobFiltersRepository, CompaniesRepository, JobDocumentsRepository } from "../database/repositories";
import { TaskRegistry } from "../tasks/task-registry";
import { TaskQueueService } from "../tasks/task-queue.service";
import { FilterService } from "../filter/filter.service";
import { GeneratorService } from "../documents/generator.service";
import type { EnvConfig } from "../config/env";
export declare const APPLICATION_STATUSES: readonly ["approved", "ready", "applied", "interviewing", "offer", "rejected", "ghosted", "withdrawn"];
export type AppStatus = (typeof APPLICATION_STATUSES)[number];
export declare class ApplicationsService {
    private readonly jobs;
    private readonly applications;
    private readonly jobFilters;
    private readonly companies;
    private readonly documents;
    private readonly generator;
    constructor(jobs: JobsRepository, applications: ApplicationsRepository, jobFilters: JobFiltersRepository, companies: CompaniesRepository, documents: JobDocumentsRepository, generator: GeneratorService);
    list(cursor?: string): Promise<{
        items: import("../database/repositories/applications.repository").ApplicationRow[];
        nextCursor: string | null;
    }>;
    updateStatus(jobId: string, status: string): Promise<{
        ok: boolean;
    }>;
    remove(jobId: string): Promise<{
        ok: boolean;
    }>;
    downloadPdf(jobId: string): Promise<{
        filePath: string;
        fileName: string;
    }>;
    generate(jobId: string, force?: boolean): Promise<{
        exists: boolean;
        pdfPath: string | null;
        document: import("../documents/generator.service").GeneratedDocument | undefined;
    }>;
}
export declare class SavedJobsService {
    private readonly config;
    private readonly jobs;
    private readonly applications;
    private readonly jobFilters;
    private readonly companies;
    private readonly filter;
    private readonly client;
    constructor(config: ConfigService<EnvConfig>, jobs: JobsRepository, applications: ApplicationsRepository, jobFilters: JobFiltersRepository, companies: CompaniesRepository, filter: FilterService);
    getSavedJobs(limit?: unknown): Promise<{
        processed: boolean;
        id: string;
        companyId: number;
        externalId: string;
        title: string;
        location: string;
        url: string;
        description: string;
        rawJson: string;
        contentHash: string;
        status: string;
        firstSeenAt: string;
        lastSeenAt: string;
        closedAt: string | null;
        createdAt: string;
        updatedAt: string;
        companySlug: string;
        companyName: string;
        ats: string;
        jobId: string;
    }[]>;
    getSavedJobsByCompany(company: string, limit?: unknown): Promise<{
        processed: boolean;
        id: string;
        companyId: number;
        externalId: string;
        title: string;
        location: string;
        url: string;
        description: string;
        rawJson: string;
        contentHash: string;
        status: string;
        firstSeenAt: string;
        lastSeenAt: string;
        closedAt: string | null;
        createdAt: string;
        updatedAt: string;
        companySlug: string;
        companyName: string;
        ats: string;
        jobId: string;
    }[]>;
    filterSavedJob(companySlug: string, jobId: string): Promise<{
        accepted: boolean;
        error: string;
        score?: undefined;
        reasons?: undefined;
        mustHaveHits?: undefined;
        missing?: undefined;
    } | {
        accepted: boolean;
        score: number;
        reasons: string[];
        mustHaveHits: string[];
        missing: string[];
        error?: undefined;
    }>;
    private parseLimit;
}
export declare class ApplicationsTasksService implements OnModuleInit {
    private readonly registry;
    private readonly jobs;
    private readonly applications;
    private readonly jobFilters;
    private readonly queue;
    private readonly logger;
    constructor(registry: TaskRegistry, jobs: JobsRepository, applications: ApplicationsRepository, jobFilters: JobFiltersRepository, queue: TaskQueueService);
    onModuleInit(): void;
    private createApplication;
}

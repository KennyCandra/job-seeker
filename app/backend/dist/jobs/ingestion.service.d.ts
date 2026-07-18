import { DataSource } from "typeorm";
import { CompaniesRepository, JobsRepository } from "../database/repositories";
import type { CompanyRecord, AtsPlatform } from "../shared/types";
import type { RawJob } from "./ats/types";
import type { TaskHandlerContext } from "../tasks/types";
export type CompanyFetchResult = {
    companyId: number;
    companySlug: string;
    companyName: string;
    ats: string;
    fetched: number;
    newCount: number;
    changedCount: number;
    unchangedCount: number;
    closedCount: number;
    newJobIds: string[];
    changedJobIds: string[];
    error?: string;
};
export type DetectMigrationResult = {
    detected: boolean;
    ats?: string;
    endpoint?: string;
    fetched?: number;
    attempted?: string[];
};
export declare class JobsIngestionService {
    private readonly dataSource;
    private readonly companies;
    private readonly jobs;
    private readonly logger;
    constructor(dataSource: DataSource, companies: CompaniesRepository, jobs: JobsRepository);
    ingestCompanyJobs(company: CompanyRecord, rawJobs: RawJob[]): Promise<CompanyFetchResult>;
    syncCompany(company: CompanyRecord, ctx?: TaskHandlerContext): Promise<CompanyFetchResult>;
    createManualJob(payload: {
        companySlug: string;
        title: string;
        location?: string;
        url?: string;
        description?: string;
        rawText?: string;
    }): Promise<{
        jobId: string;
        companySlug: string;
    }>;
    refetchJob(jobId: string, ctx?: TaskHandlerContext): Promise<{
        jobId: string;
        source: string;
    }>;
    detectMigration(companySlug: string, prevAts: AtsPlatform, ctx?: TaskHandlerContext): Promise<DetectMigrationResult>;
}

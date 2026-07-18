import { ConfigService } from "@nestjs/config";
import { JobsRepository, JobFiltersRepository } from "../database/repositories";
import type { SearchConfig } from "../config/search-config.service";
import type { EnvConfig } from "../config/env";
export declare const NORMAL_FILTER_PROMPT_VERSION = "normal-filter-scoring-v1";
export declare const SMART_FILTER_PROMPT_VERSION = "smart-filter-v1";
export type FilterResult = {
    verdict: "accept" | "reject";
    score: number;
    reasons: string[];
    must_have_hits: string[];
    missing: string[];
};
export type FilteredJob = {
    job: any;
    filter: FilterResult;
};
export type JobRecordLite = {
    id: string;
    site: string;
    title: string;
    company: string;
    location: string;
    url: string;
    description: string;
};
export declare class FilterService {
    private readonly config;
    private readonly jobs;
    private readonly jobFilters;
    private readonly logger;
    private readonly client;
    constructor(config: ConfigService<EnvConfig>, jobs: JobsRepository, jobFilters: JobFiltersRepository);
    filterJob(job: JobRecordLite, targetCompanies?: string[]): Promise<FilteredJob | null>;
    normalFilterJob(job: JobRecordLite, config: SearchConfig): FilteredJob;
    saveNormalFilterResult(jobId: string, contentHash: string, result: FilteredJob, sequence?: number): Promise<void>;
    saveSmartFilterResult(jobId: string, contentHash: string, result: FilteredJob): Promise<void>;
    getNormalFilterCandidates(options: {
        limit?: number;
        force?: boolean;
        companySlug?: string;
        includeClosed?: boolean;
    }): Promise<{
        candidates: {
            jobId: string;
            companyName: string;
            title: string;
            contentHash: string;
        }[];
        skipped: number;
        skippedClosed: number;
        skippedExisting: number;
    }>;
    toLiteJob(row: any): JobRecordLite;
    private normalizeFilter;
    private findTermHits;
    private collectWeightedHits;
    private uniqueTerms;
    private termKey;
    private termMatches;
    private isFrontendOnlyTitle;
    private scoreExperience;
    private clampScore;
}

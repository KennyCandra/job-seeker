import { DataSource, type EntityManager } from "typeorm";
import type { JobRow, SavedJob } from "../../shared/types";
export type SaveJobInput = {
    id: string;
    companyId: number;
    externalId: string;
    url: string;
    title?: string;
    location?: string;
    description?: string;
    rawJson?: unknown;
    status?: string;
};
export type JobWithCompany = JobRow & {
    companySlug: string;
    companyName: string;
    ats: string;
};
export type JobSearchInput = {
    page?: number;
    pageSize?: number;
    search?: string;
    companyName?: string;
    status?: string;
    verdict?: string;
    smartVerdict?: string;
    minScore?: number;
    fetchedWithinHours?: number;
};
export type JobSearchItem = {
    id: string;
    companySlug: string;
    companyName: string;
    title: string;
    location: string;
    url: string;
    status: string;
    ats: string;
    score: number | null;
    verdict: string | null;
    smartScore: number | null;
    smartVerdict: string | null;
    hasCv: boolean;
    hasCoverLetter: boolean;
    hasRecommendation: boolean;
    hasApplication: boolean;
    updatedAt: string;
};
export type JobSearchResult = {
    items: JobSearchItem[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    summary: {
        accepted: number;
        rejected: number;
        unfiltered: number;
        smartAccepted: number;
        smartRejected: number;
        smartUnfiltered: number;
    };
    options: {
        companies: string[];
        statuses: string[];
    };
};
export declare class JobsRepository {
    private readonly dataSource;
    constructor(dataSource: DataSource);
    save(input: SaveJobInput, manager?: EntityManager): Promise<void>;
    getById(id: string): Promise<JobWithCompany | undefined>;
    get(companySlug: string, externalOrJobId: string): Promise<SavedJob | undefined>;
    getAll(limit?: number | null): Promise<SavedJob[]>;
    search(input?: JobSearchInput): Promise<JobSearchResult>;
    getByCompany(companySlug: string, limit?: number | null): Promise<SavedJob[]>;
    delete(companySlug: string, externalOrJobId: string): Promise<void>;
    count(): Promise<number>;
    countByCompany(companySlug: string): Promise<number>;
    getByCompanyId(companyId: number): Promise<JobRow[]>;
    updateLastSeen(jobId: string, lastSeenAt: string): Promise<void>;
    markClosedMissing(companyId: number, seenExternalIds: string[], manager?: EntityManager): Promise<number>;
    getJobDetail(jobId: string): Promise<import("../queries/job-detail.query").JobDetailReadModel | null>;
    computeContentHash(input: {
        title: string;
        location: string;
        url: string;
        description: string;
        rawJson: unknown;
    }): string;
}

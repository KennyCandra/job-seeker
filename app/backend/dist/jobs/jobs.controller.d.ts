import { JobsService } from "./jobs.service";
export declare class JobsController {
    private readonly jobs;
    constructor(jobs: JobsService);
    search(page?: string, pageSize?: string, search?: string, company?: string, status?: string, verdict?: string, smartVerdict?: string, minScore?: string, fetchedWithinHours?: string): Promise<import("../database/repositories/jobs.repository").JobSearchResult>;
    filterCandidates(body: {
        limit?: number;
        force?: boolean;
        companySlug?: string;
        includeClosed?: boolean;
    }): Promise<{
        runId: string;
        bullJobId: string | undefined;
        status: string;
        ok: boolean;
    }>;
    smartFilterAccepted(body: {
        force?: boolean;
    }): Promise<{
        runId: string;
        bullJobId: string | undefined;
        status: string;
        ok: boolean;
    }>;
    manual(body: {
        text: string;
    }): Promise<{
        ok: boolean;
        job: any;
        companySlug: string;
    }>;
    detail(jobId: string): Promise<import("../database/queries/job-detail.query").JobDetailReadModel>;
    refetch(jobId: string): Promise<{
        runId: string;
        bullJobId: string | undefined;
        status: string;
        ok: boolean;
        jobId: string;
    }>;
    filterJob(jobId: string): Promise<{
        runId: string;
        bullJobId: string | undefined;
        status: string;
        ok: boolean;
        jobId: string;
    }>;
    smartFilterJob(jobId: string): Promise<{
        runId: string;
        bullJobId: string | undefined;
        status: string;
        ok: boolean;
        jobId: string;
    }>;
    createApplication(jobId: string): Promise<{
        runId: string;
        bullJobId: string | undefined;
        status: string;
        ok: boolean;
        jobId: string;
    }>;
}

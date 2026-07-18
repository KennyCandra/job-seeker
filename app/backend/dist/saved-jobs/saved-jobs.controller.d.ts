import { SavedJobsService } from "../applications/applications.service";
export declare class SavedJobsController {
    private readonly saved;
    constructor(saved: SavedJobsService);
    getSavedJobs(limit?: string): Promise<{
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
    getSavedJobsByCompany(company: string, limit?: string): Promise<{
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
}

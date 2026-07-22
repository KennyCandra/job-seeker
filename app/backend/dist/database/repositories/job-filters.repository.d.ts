import { DataSource } from "typeorm";
export type SaveJobFilterInput = {
    id: string;
    jobId: string;
    contentHash?: string;
    verdict?: string;
    score?: number;
    reasons?: string[];
    mustHaveHits?: string[];
    missingItems?: string[];
    model?: string;
    promptVersion?: string;
    createdAt?: string;
};
export type JobFilterRow = {
    id: string;
    jobId: string;
    contentHash: string;
    verdict: string;
    score: number;
    reasons: string[];
    mustHaveHits: string[];
    missingItems: string[];
    model: string;
    promptVersion: string;
    createdAt: string;
};
export declare class JobFiltersRepository {
    private readonly dataSource;
    constructor(dataSource: DataSource);
    getSmartFilterCandidateJobIds(force?: boolean): Promise<string[]>;
    save(input: SaveJobFilterInput): Promise<void>;
    getByJobId(jobId: string): Promise<JobFilterRow[]>;
}

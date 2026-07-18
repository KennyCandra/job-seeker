import type { Job } from "./job.entity";
export declare class JobFilterEntity {
    id: string;
    jobId: string;
    job: Job;
    contentHash: string;
    verdict: string;
    score: number;
    reasons: string;
    mustHaveHits: string;
    missingItems: string;
    model: string;
    promptVersion: string;
    createdAt: string;
}

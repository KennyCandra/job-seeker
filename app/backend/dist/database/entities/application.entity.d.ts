import type { Job } from "./job.entity";
export declare class Application {
    id: string;
    jobId: string;
    job: Job;
    status: string;
    score: number;
    documents: string;
    notes: string;
    createdAt: string;
    updatedAt: string;
}

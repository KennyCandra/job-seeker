import type { Job } from "./job.entity";
export declare class JobDocument {
    id: string;
    jobId: string;
    job: Job;
    type: string;
    status: string;
    content: string;
    filePath: string;
    metadata: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
}

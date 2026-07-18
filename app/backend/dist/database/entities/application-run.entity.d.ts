import type { Job } from "./job.entity";
import { ApplicationRunStep } from "./application-run-step.entity";
export declare class ApplicationRun {
    id: string;
    jobId: string;
    job: Job;
    steps: ApplicationRunStep[];
    status: string;
    profilePath: string;
    outputDir: string;
    currentUrl: string;
    error: string | null;
    summary: string;
    createdAt: string;
    updatedAt: string;
}

import type { ApplicationRun } from "./application-run.entity";
export declare class ApplicationRunStep {
    id: string;
    runId: string;
    run: ApplicationRun;
    type: string;
    label: string;
    detail: string;
    screenshotPath: string | null;
    payload: string;
    createdAt: string;
}

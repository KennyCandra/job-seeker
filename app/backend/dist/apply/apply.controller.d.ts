import type { Response } from "express";
import { ApplyService } from "./apply.service";
export declare class ApplyController {
    private readonly apply;
    constructor(apply: ApplyService);
    startRun(jobId: string, body: {
        profilePath?: string;
    }): Promise<{
        ok: boolean;
        runId: string;
        taskRunId: string | undefined;
        message: string;
    }>;
    latest(jobId: string): Promise<{
        run: null;
        steps: never[];
    } | {
        run: import("../database/repositories/application-runs.repository").ApplicationRunRow;
        steps: import("../database/repositories/application-run-steps.repository").ApplicationRunStepRecord[];
    }>;
    getRun(runId: string): Promise<{
        run: import("../database/repositories/application-runs.repository").ApplicationRunRow;
        steps: import("../database/repositories/application-run-steps.repository").ApplicationRunStepRecord[];
    } | null>;
    resume(runId: string): Promise<{
        ok: boolean;
        dispatched: boolean;
    }>;
    cancel(runId: string): Promise<{
        ok: boolean;
    }>;
    screenshots(runId: string, file: string, res: Response): Promise<void>;
}

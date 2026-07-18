import { Queue } from "bullmq";
import { JobsRepository, ApplicationRunsRepository, ApplicationRunStepsRepository } from "../database/repositories";
import { ApplyControlService } from "./apply-control.service";
export declare class ApplyService {
    private readonly queue;
    private readonly jobs;
    private readonly runs;
    private readonly steps;
    private readonly control;
    private readonly logger;
    constructor(queue: Queue, jobs: JobsRepository, runs: ApplicationRunsRepository, steps: ApplicationRunStepsRepository, control: ApplyControlService);
    startRun(jobId: string, profilePath?: string): Promise<{
        ok: boolean;
        runId: string;
        taskRunId: string | undefined;
        message: string;
    }>;
    getLatest(jobId: string): Promise<{
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
    getScreenshot(runId: string, fileName: string): Promise<{
        filePath: string;
        contentType: string;
    }>;
}

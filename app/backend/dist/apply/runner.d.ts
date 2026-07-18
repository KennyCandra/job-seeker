import { OpenCodeClient } from "../shared/llm";
import type { ApplicantProfile } from "./profile";
import type { ApplicationRunsRepository } from "../database/repositories/application-runs.repository";
import type { ApplicationRunStepsRepository } from "../database/repositories/application-run-steps.repository";
export type ApplyRunOptions = {
    runId: string;
    jobId: string;
    url: string;
    profile: ApplicantProfile;
    answersMarkdown: string;
    headless?: boolean;
    keepBrowserOnBlock?: boolean;
    llm: OpenCodeClient;
    runsRepo: ApplicationRunsRepository;
    stepsRepo: ApplicationRunStepsRepository;
};
export type ApplyRunResult = {
    runId: string;
    status: "review" | "needs_user" | "failed";
    error?: string;
    stepCount: number;
    outputDir: string;
};
export declare function runApply(options: ApplyRunOptions): Promise<ApplyRunResult>;

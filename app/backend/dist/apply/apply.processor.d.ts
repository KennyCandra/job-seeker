import { ConfigService } from "@nestjs/config";
import { WorkerHost } from "@nestjs/bullmq";
import type { Job } from "bullmq";
import { JobsRepository, ApplicationRunsRepository, ApplicationRunStepsRepository, UserProfileRepository, UserAnswersRepository } from "../database/repositories";
import { ApplyControlService } from "./apply-control.service";
import type { EnvConfig } from "../config/env";
interface ApplyJobData {
    applyRunId?: string;
    jobId: string;
    url: string;
}
export declare class ApplyProcessor extends WorkerHost {
    private readonly jobs;
    private readonly runs;
    private readonly steps;
    private readonly profile;
    private readonly userAnswers;
    private readonly control;
    private readonly config;
    private readonly logger;
    constructor(jobs: JobsRepository, runs: ApplicationRunsRepository, steps: ApplicationRunStepsRepository, profile: UserProfileRepository, userAnswers: UserAnswersRepository, control: ApplyControlService, config: ConfigService<EnvConfig>);
    process(job: Job<ApplyJobData>): Promise<any>;
}
export {};

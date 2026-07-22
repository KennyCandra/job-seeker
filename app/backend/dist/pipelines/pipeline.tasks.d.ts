import { OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { TaskRegistry } from "../tasks/task-registry";
import { TaskQueueService } from "../tasks/task-queue.service";
import { TaskRunsRepository, CompaniesRepository, CompanySnapshotsRepository } from "../database/repositories";
import type { EnvConfig } from "../config/env";
export type DailyPipelineResult = {
    syncRan: boolean;
    companies: number;
    syncCompleted: number;
    syncFailed: number;
    syncCancelled: number;
    snapshotDate: string;
    snapshots: number;
    llmReachable: boolean;
    smartFilterRan: boolean;
    smartFilter: unknown;
};
export declare class PipelineTasksService implements OnModuleInit {
    private readonly registry;
    private readonly queue;
    private readonly taskRuns;
    private readonly companies;
    private readonly snapshots;
    private readonly config;
    private readonly logger;
    pollMs: number;
    constructor(registry: TaskRegistry, queue: TaskQueueService, taskRuns: TaskRunsRepository, companies: CompaniesRepository, snapshots: CompanySnapshotsRepository, config: ConfigService<EnvConfig>);
    onModuleInit(): void;
    private dailyPipeline;
}

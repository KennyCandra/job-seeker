import { OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SchedulerRegistry } from "@nestjs/schedule";
import { TaskQueueService } from "../tasks/task-queue.service";
import { TaskRunsRepository } from "../database/repositories";
import type { EnvConfig } from "../config/env";
export declare class SchedulerService implements OnModuleInit {
    private readonly registry;
    private readonly taskQueue;
    private readonly taskRuns;
    private readonly config;
    private readonly logger;
    constructor(registry: SchedulerRegistry, taskQueue: TaskQueueService, taskRuns: TaskRunsRepository, config: ConfigService<EnvConfig>);
    onModuleInit(): void;
    private tickSync;
    private tickDiscovery;
    private tickDailyPipeline;
    private enqueueDailyPipeline;
}

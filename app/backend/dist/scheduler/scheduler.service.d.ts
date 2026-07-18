import { OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { SchedulerRegistry } from "@nestjs/schedule";
import { TaskQueueService } from "../tasks/task-queue.service";
import type { EnvConfig } from "../config/env";
export declare class SchedulerService implements OnModuleInit {
    private readonly registry;
    private readonly taskQueue;
    private readonly config;
    private readonly logger;
    constructor(registry: SchedulerRegistry, taskQueue: TaskQueueService, config: ConfigService<EnvConfig>);
    onModuleInit(): void;
    private tickSync;
    private tickDiscovery;
}

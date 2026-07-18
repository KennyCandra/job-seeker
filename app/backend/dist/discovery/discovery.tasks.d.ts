import { OnModuleInit } from "@nestjs/common";
import { TaskRegistry } from "../tasks/task-registry";
import { TaskQueueService } from "../tasks/task-queue.service";
import { TaskRunsService } from "../tasks/task-runs.service";
import { CompaniesRepository } from "../database/repositories";
import { DiscoveryService } from "./discovery.service";
export declare class DiscoveryTasksService implements OnModuleInit {
    private readonly registry;
    private readonly queue;
    private readonly runs;
    private readonly companies;
    private readonly discovery;
    constructor(registry: TaskRegistry, queue: TaskQueueService, runs: TaskRunsService, companies: CompaniesRepository, discovery: DiscoveryService);
    onModuleInit(): void;
    private discoverCompanies;
    private discoverFetchFilter;
}

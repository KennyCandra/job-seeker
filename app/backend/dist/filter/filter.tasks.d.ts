import { OnModuleInit } from "@nestjs/common";
import { TaskRegistry } from "../tasks/task-registry";
import { TaskQueueService } from "../tasks/task-queue.service";
import { TaskRunsService } from "../tasks/task-runs.service";
import { JobsRepository, JobFiltersRepository } from "../database/repositories";
import { FilterService } from "./filter.service";
import { SearchConfigService } from "../config/search-config.service";
export declare class FilterTasksService implements OnModuleInit {
    private readonly registry;
    private readonly queue;
    private readonly runs;
    private readonly jobs;
    private readonly filter;
    private readonly config;
    private readonly jobFiltersRepo;
    private readonly logger;
    constructor(registry: TaskRegistry, queue: TaskQueueService, runs: TaskRunsService, jobs: JobsRepository, filter: FilterService, config: SearchConfigService, jobFiltersRepo: JobFiltersRepository);
    onModuleInit(): void;
    private normalFilterBatch;
    private normalFilterJob;
    private smartFilterAccepted;
    private smartFilterJob;
}

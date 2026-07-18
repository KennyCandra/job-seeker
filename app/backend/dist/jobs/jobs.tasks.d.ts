import { OnModuleInit } from "@nestjs/common";
import { TaskRegistry } from "../tasks/task-registry";
import { TaskQueueService } from "../tasks/task-queue.service";
import { JobsIngestionService } from "./ingestion.service";
import { CompaniesRepository, JobsRepository } from "../database/repositories";
import { FilterService } from "../filter/filter.service";
import { SearchConfigService } from "../config/search-config.service";
export declare class JobsTasksService implements OnModuleInit {
    private readonly registry;
    private readonly ingestion;
    private readonly companies;
    private readonly jobs;
    private readonly taskQueue;
    private readonly filter;
    private readonly searchConfig;
    constructor(registry: TaskRegistry, ingestion: JobsIngestionService, companies: CompaniesRepository, jobs: JobsRepository, taskQueue: TaskQueueService, filter: FilterService, searchConfig: SearchConfigService);
    onModuleInit(): void;
    private syncAllJobs;
    private syncCompany;
    private refetchJob;
    private detectMigration;
}

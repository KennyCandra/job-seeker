import { WorkerHost } from "@nestjs/bullmq";
import type { Job } from "bullmq";
import { TaskRegistry } from "./task-registry";
import { TaskRunsRepository, TaskRunLogsRepository } from "../database/repositories";
import type { TaskType } from "./types";
interface TaskJobData {
    runId: string;
    type: TaskType;
    payload: Record<string, unknown>;
    force?: boolean;
}
export declare class TaskProcessor extends WorkerHost {
    private readonly registry;
    private readonly taskRuns;
    private readonly taskRunLogs;
    private readonly logger;
    constructor(registry: TaskRegistry, taskRuns: TaskRunsRepository, taskRunLogs: TaskRunLogsRepository);
    process(job: Job<TaskJobData>): Promise<void>;
}
export {};

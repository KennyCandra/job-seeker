import { Queue } from "bullmq";
import { TaskRunsRepository, TaskRunLogsRepository } from "../database/repositories";
import type { TaskType, EnqueueOptions } from "./types";
export declare class TaskQueueService {
    private readonly queue;
    private readonly taskRuns;
    private readonly taskRunLogs;
    private readonly logger;
    constructor(queue: Queue, taskRuns: TaskRunsRepository, taskRunLogs: TaskRunLogsRepository);
    enqueueTask(type: TaskType, payload: Record<string, unknown>, opts?: EnqueueOptions): Promise<{
        runId: string;
        bullJobId: string | undefined;
        status: string;
    }>;
    cancelTask(runId: string): Promise<boolean>;
}

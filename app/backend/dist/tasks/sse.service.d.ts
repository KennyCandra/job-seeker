import type { Response } from "express";
import { TaskRunsRepository, TaskRunLogsRepository } from "../database/repositories";
export declare class TasksSseService {
    private readonly taskRuns;
    private readonly taskRunLogs;
    private readonly logger;
    constructor(taskRuns: TaskRunsRepository, taskRunLogs: TaskRunLogsRepository);
    stream(res: Response, runId: string): Promise<void>;
}

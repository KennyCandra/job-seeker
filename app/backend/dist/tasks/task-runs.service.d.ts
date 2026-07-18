import { TaskRunsRepository, TaskRunLogsRepository } from "../database/repositories";
import type { TaskRunRecord, TaskRunLogRecord, TaskStatus } from "./types";
export declare class TaskRunsService {
    private readonly taskRuns;
    private readonly taskRunLogs;
    constructor(taskRuns: TaskRunsRepository, taskRunLogs: TaskRunLogsRepository);
    list(limit?: number, status?: TaskStatus): Promise<TaskRunRecord[]>;
    countByStatuses(): Promise<{
        total: number;
        queued: number;
        running: number;
        completed: number;
        failed: number;
        cancelled: number;
    }>;
    get(runId: string): Promise<TaskRunRecord | null>;
    getLogs(runId: string): Promise<TaskRunLogRecord[]>;
    getStatuses(runIds: string[]): Promise<Record<string, string>>;
}

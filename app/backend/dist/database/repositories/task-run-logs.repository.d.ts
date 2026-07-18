import { DataSource } from "typeorm";
import type { TaskRunLogRecord } from "../../tasks/types";
export declare class TaskRunLogsRepository {
    private readonly dataSource;
    constructor(dataSource: DataSource);
    create(runId: string, level: string, message: string, payload?: Record<string, unknown>): Promise<string>;
    getByRunId(runId: string, limit?: number): Promise<TaskRunLogRecord[]>;
    getAfter(runId: string, cursor: {
        createdAt: string;
        id: string;
    } | null, limit?: number): Promise<TaskRunLogRecord[]>;
}

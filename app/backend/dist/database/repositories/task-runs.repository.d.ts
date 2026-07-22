import { DataSource, type EntityManager } from "typeorm";
import type { TaskType, TaskStatus, TaskRunRecord } from "../../tasks/types";
export type CreateTaskRunInput = {
    id: string;
    bullJobId: string | null;
    type: TaskType;
    status: TaskStatus;
    dedupeKey: string | null;
    payloadJson: string;
    progressJson: string | null;
    resultJson: string | null;
    error: string | null;
    createdAt: string;
    startedAt: string | null;
    completedAt: string | null;
    updatedAt: string;
};
export declare class TaskRunsRepository {
    private readonly dataSource;
    constructor(dataSource: DataSource);
    create(input: CreateTaskRunInput, manager?: EntityManager): Promise<void>;
    getById(id: string): Promise<TaskRunRecord | undefined>;
    getByStatus(status: TaskStatus): Promise<TaskRunRecord[]>;
    findActiveByDedupeKey(dedupeKey: string): Promise<TaskRunRecord | undefined>;
    updateStatus(id: string, status: TaskStatus): Promise<void>;
    updateProgress(id: string, progress: unknown): Promise<void>;
    updateResult(id: string, result: unknown): Promise<void>;
    listRecent(limit?: number, status?: TaskStatus): Promise<TaskRunRecord[]>;
    countByStatuses(): Promise<{
        total: number;
        queued: number;
        running: number;
        completed: number;
        failed: number;
        cancelled: number;
    }>;
    getStatusesByIds(ids: string[]): Promise<Array<{
        id: string;
        status: TaskStatus;
    }>>;
    getRecentCompletedByType(type: TaskType, limit?: number): Promise<TaskRunRecord[]>;
    updateError(id: string, error: string): Promise<void>;
}

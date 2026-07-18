export type TaskType = "discover-companies" | "discover-fetch-filter" | "sync-all-jobs" | "sync-company" | "normal-filter-batch" | "normal-filter-job" | "smart-filter-accepted" | "smart-filter-job" | "refetch-job" | "create-application" | "run-apply" | "detect-migration" | "ln-companies" | "ln-fetch-filter";
export declare const REGISTERED_TASK_TYPES: readonly TaskType[];
export type TaskStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export interface EnqueueOptions {
    force?: boolean;
    dedupeKey?: string;
    jobId?: string;
    attempts?: number;
    backoff?: {
        type: "exponential" | "fixed";
        delay: number;
    };
    removeOnComplete?: {
        age: number;
    } | boolean;
    removeOnFail?: {
        age: number;
    } | boolean;
}
export interface TaskPayload {
    type: TaskType;
    payload: Record<string, unknown>;
    force?: boolean;
}
export interface TaskRunRecord {
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
}
export interface TaskRunLogRecord {
    id: string;
    runId: string;
    level: string;
    message: string;
    payloadJson: string | null;
    createdAt: string;
}
export interface TaskHandlerContext {
    runId: string;
    payload: Record<string, unknown>;
    log: (level: string, message: string, meta?: Record<string, unknown>) => Promise<void>;
    progress: (value: Record<string, unknown>) => Promise<void>;
    isCancelled: () => Promise<boolean>;
    throwIfCancelled: () => Promise<void>;
}
export type HandlerFn = (ctx: TaskHandlerContext, payload: Record<string, unknown>) => Promise<unknown>;

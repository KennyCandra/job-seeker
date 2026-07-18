import type { TaskRunLog } from "./task-run-log.entity";
export declare class TaskRun {
    id: string;
    logs: TaskRunLog[];
    bullJobId: string | null;
    type: string;
    status: string;
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

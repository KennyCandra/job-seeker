import type { TaskRun } from "./task-run.entity";
export declare class TaskRunLog {
    id: string;
    runId: string;
    run: TaskRun;
    level: string;
    message: string;
    payloadJson: string | null;
    createdAt: string;
}

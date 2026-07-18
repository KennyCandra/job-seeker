import type { Response } from "express";
import { TaskRunsService } from "./task-runs.service";
import { TaskQueueService } from "./task-queue.service";
import { TasksSseService } from "./sse.service";
import { type TaskStatus } from "./types";
export declare class TasksController {
    private readonly runs;
    private readonly queue;
    private readonly sse;
    constructor(runs: TaskRunsService, queue: TaskQueueService, sse: TasksSseService);
    list(query: {
        limit: number;
        status?: TaskStatus;
    }): Promise<{
        ok: boolean;
        tasks: import("./types").TaskRunRecord[];
        total: number;
        counts: {
            total: number;
            queued: number;
            running: number;
            completed: number;
            failed: number;
            cancelled: number;
        };
    }>;
    create(body: {
        type: string;
        payload?: any;
        dedupeKey?: string;
        waitForCompletion?: boolean;
    }): Promise<{
        runId: string;
        bullJobId: string | undefined;
        status: string;
    }>;
    statuses(runIds?: string[]): Promise<Record<string, string>>;
    get(runId: string): Promise<import("./types").TaskRunRecord | null>;
    logs(runId: string): Promise<import("./types").TaskRunLogRecord[]>;
    sseStream(res: Response, runId: string): Promise<void>;
    cancel(runId: string): Promise<{
        ok: boolean;
    }>;
}

import type { TaskType, HandlerFn } from "./types";
export declare class TaskRegistry {
    private readonly handlers;
    private readonly logger;
    register(type: TaskType, fn: HandlerFn): void;
    get(type: TaskType): HandlerFn | undefined;
    has(type: TaskType): boolean;
}

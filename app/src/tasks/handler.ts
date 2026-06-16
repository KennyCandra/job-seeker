import type { TaskHandlerContext, TaskType } from "../queue/types";

export type HandlerFn = (ctx: TaskHandlerContext) => Promise<Record<string, unknown>>;

const handlers = new Map<TaskType, HandlerFn>();

export function registerHandler(type: TaskType, fn: HandlerFn): void {
  handlers.set(type, fn);
}

export function getHandler(type: TaskType): HandlerFn | undefined {
  return handlers.get(type);
}

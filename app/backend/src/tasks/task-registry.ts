import { Injectable, Logger } from "@nestjs/common";
import type { TaskType, HandlerFn } from "./types";

@Injectable()
export class TaskRegistry {
  private readonly handlers = new Map<TaskType, HandlerFn>();
  private readonly logger = new Logger(TaskRegistry.name);

  register(type: TaskType, fn: HandlerFn): void {
    this.handlers.set(type, fn);
    this.logger.log(`Registered task handler: ${type}`);
  }

  get(type: TaskType): HandlerFn | undefined {
    return this.handlers.get(type);
  }

  has(type: TaskType): boolean {
    return this.handlers.has(type);
  }
}

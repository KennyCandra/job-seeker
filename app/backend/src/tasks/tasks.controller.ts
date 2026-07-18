import { Controller, Get, Post, Param, Res, Query, ParseArrayPipe, Body } from "@nestjs/common";
import type { Response } from "express";
import { TaskRunsService } from "./task-runs.service";
import { TaskQueueService } from "./task-queue.service";
import { TasksSseService } from "./sse.service";
import { ZodValidationPipe } from "../common/validation.pipe";
import { createTaskSchema, listTasksQuerySchema } from "../common/dto";
import { REGISTERED_TASK_TYPES, type TaskType, type TaskStatus } from "./types";
import { AppException } from "../common/errors";

@Controller("tasks")
export class TasksController {
  constructor(
    private readonly runs: TaskRunsService,
    private readonly queue: TaskQueueService,
    private readonly sse: TasksSseService,
  ) {}

  @Get()
  async list(
    @Query(new ZodValidationPipe(listTasksQuerySchema))
    query: { limit: number; status?: TaskStatus },
  ) {
    const [tasks, counts] = await Promise.all([
      this.runs.list(query.limit, query.status),
      this.runs.countByStatuses(),
    ]);
    return { ok: true, tasks, total: counts.total, counts };
  }

  @Post()
  async create(@Body(new ZodValidationPipe(createTaskSchema)) body: { type: string; payload?: any; dedupeKey?: string; waitForCompletion?: boolean }) {
    if (!REGISTERED_TASK_TYPES.includes(body.type as TaskType)) {
      throw new AppException(400, `Unknown task type: ${body.type}`);
    }
    return this.queue.enqueueTask(body.type as TaskType, body.payload ?? {}, { dedupeKey: body.dedupeKey });
  }

  @Get("status")
  statuses(@Query("runIds", new ParseArrayPipe({ optional: true })) runIds: string[] = []) {
    return this.runs.getStatuses(runIds);
  }

  @Get(":runId")
  get(@Param("runId") runId: string) {
    return this.runs.get(runId);
  }

  @Get(":runId/logs")
  logs(@Param("runId") runId: string) {
    return this.runs.getLogs(runId);
  }

  @Get(":runId/events")
  async sseStream(@Res() res: Response, @Param("runId") runId: string) {
    await this.sse.stream(res, runId);
  }

  @Post(":runId/cancel")
  async cancel(@Param("runId") runId: string) {
    const ok = await this.queue.cancelTask(runId);
    return { ok };
  }
}

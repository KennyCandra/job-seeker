import { Controller, Post, Get, Body, Res, Query } from "@nestjs/common";
import type { Response } from "express";
import { extractJobFromText } from "../shared/documents";
import { GeneratorService } from "../documents/generator.service";
import { TaskQueueService } from "../tasks/task-queue.service";
import { TasksSseService } from "../tasks/sse.service";
import { ZodValidationPipe } from "../common/validation.pipe";
import { extractJobSchema, generateCvSchema } from "../common/dto";
import { setupSse } from "../common/sse";
import type { TaskType } from "../tasks/types";

@Controller("job")
export class JobExtractController {
  @Post("extract")
  async extract(@Body(new ZodValidationPipe(extractJobSchema)) body: { text: string }) {
    return extractJobFromText(body.text);
  }
}

@Controller("cv")
export class CvController {
  constructor(private readonly generator: GeneratorService) {}

  @Post("generate")
  async generate(
    @Body(new ZodValidationPipe(generateCvSchema)) body: { jobId: string; profileText?: string },
    @Query("force") force?: string,
    @Res() res?: Response,
  ) {
    if (!res) return { error: "Response required" };
    const send = setupSse(res);
    try {
      const result = await this.generator.generate(body.jobId, "cv", force === "true");
      const doc = result.document;
      const pdfPath = doc ? `/api/jobs/${body.jobId}/documents/${doc.id}/download` : null;
      send("log", { type: "done", message: "CV generated successfully" });
      send("done", { pdfPath, jobId: body.jobId });
    } catch (err: any) {
      send("log", { type: "error", message: err?.message ?? String(err) });
      send("done", { error: err?.message ?? String(err) });
    }
    res.end();
  }
}

// Legacy compat: GET-with-side-effects kept for the old frontend; remove in
// Phase E cutover (docs/remaining-work-plan.md).
@Controller("pipeline")
export class PipelineController {
  constructor(
    private readonly queue: TaskQueueService,
    private readonly sse: TasksSseService,
  ) {}

  @Get("run")
  async run(@Res() res: Response) {
    const { runId } = await this.queue.enqueueTask("sync-all-jobs" as TaskType, {}, { dedupeKey: "sync-all-jobs" });
    await this.sse.stream(res, runId);
  }

  @Get("discover")
  async discover(@Res() res: Response) {
    const { runId } = await this.queue.enqueueTask("discover-companies" as TaskType, {}, { dedupeKey: "discover-companies" });
    await this.sse.stream(res, runId);
  }

  @Get("discover-and-process")
  async discoverAndProcess(@Res() res: Response) {
    const { runId } = await this.queue.enqueueTask("discover-fetch-filter" as TaskType, {}, { dedupeKey: "discover-fetch-filter" });
    await this.sse.stream(res, runId);
  }
}

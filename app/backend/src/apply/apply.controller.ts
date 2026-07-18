import { Controller, Get, Post, Param, Body, Res } from "@nestjs/common";
import type { Response } from "express";
import { ApplyService } from "./apply.service";

@Controller()
export class ApplyController {
  constructor(private readonly apply: ApplyService) {}

  @Post("jobs/:jobId/apply/run")
  startRun(@Param("jobId") jobId: string, @Body() body: { profilePath?: string }) {
    return this.apply.startRun(jobId, body?.profilePath);
  }

  @Get("jobs/:jobId/apply/latest")
  latest(@Param("jobId") jobId: string) {
    return this.apply.getLatest(jobId);
  }

  @Get("apply/runs/:runId")
  getRun(@Param("runId") runId: string) {
    return this.apply.getRun(runId);
  }

  @Post("apply/runs/:runId/resume")
  resume(@Param("runId") runId: string) {
    return this.apply.resume(runId);
  }

  @Post("apply/runs/:runId/cancel")
  cancel(@Param("runId") runId: string) {
    return this.apply.cancel(runId);
  }

  @Get("apply/runs/:runId/screenshots/:file")
  async screenshots(@Param("runId") runId: string, @Param("file") file: string, @Res() res: Response) {
    const { filePath, contentType } = await this.apply.getScreenshot(runId, file);
    res.setHeader("Content-Type", contentType);
    res.sendFile(filePath);
  }
}

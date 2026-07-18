import { Controller, Get, Post, Patch, Delete, Param, Query, Res, Body } from "@nestjs/common";
import type { Response } from "express";
import { ApplicationsService } from "./applications.service";
import { ZodValidationPipe } from "../common/validation.pipe";
import { updateApplicationStatusSchema } from "../common/dto";
import { AppException } from "../common/errors";
import { setupSse } from "../common/sse";

@Controller("applications")
export class ApplicationsController {
  constructor(private readonly apps: ApplicationsService) {}

  @Get()
  list(@Query("cursor") cursor?: string) {
    return this.apps.list(cursor);
  }

  @Patch(":jobId/status")
  updateStatus(@Param("jobId") jobId: string, @Body(new ZodValidationPipe(updateApplicationStatusSchema)) body: { status: string }) {
    return this.apps.updateStatus(jobId, body?.status);
  }

  @Delete(":jobId")
  remove(@Param("jobId") jobId: string) {
    return this.apps.remove(jobId);
  }

  @Get(":jobId/pdf")
  async downloadPdf(@Param("jobId") jobId: string, @Res() res: Response) {
    const { filePath, fileName } = await this.apps.downloadPdf(jobId);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.sendFile(filePath);
  }

  @Post(":jobId/generate")
  async generate(@Param("jobId") jobId: string, @Query("force") force?: string, @Res() res?: Response) {
    if (!res) throw new AppException(500, "Response required");
    const send = setupSse(res);
    try {
      const result = await this.apps.generate(jobId, force === "true");
      send("log", { type: "done", message: "CV generated successfully" });
      send("done", {
        exists: result.exists,
        pdfPath: result.pdfPath,
      });
    } catch (err: any) {
      send("log", { type: "error", message: err?.message ?? String(err) });
      send("done", { error: err?.message ?? String(err) });
    }
    res.end();
  }
}

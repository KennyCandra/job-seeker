import { Controller, Get, Post, Param, Res, Body } from "@nestjs/common";
import type { Response } from "express";
import { GeneratorService } from "./generator.service";
import { ZodValidationPipe } from "../common/validation.pipe";
import { generateDocumentSchema } from "../common/dto";

@Controller("jobs")
export class DocumentsController {
  constructor(private readonly generator: GeneratorService) {}

  @Get(":jobId/documents")
  list(@Param("jobId") jobId: string) {
    return this.generator.list(jobId);
  }

  @Post(":jobId/documents")
  async generate(
    @Param("jobId") jobId: string,
    @Body(new ZodValidationPipe(generateDocumentSchema)) body: { type: string; force?: boolean },
  ) {
    const result = await this.generator.generate(jobId, body.type, Boolean(body.force));
    return { ok: true, jobId, type: body.type, ...result };
  }

  @Get(":jobId/documents/:documentId/download")
  async download(@Param("jobId") jobId: string, @Param("documentId") documentId: string, @Res() res: Response) {
    const file = await this.generator.download(jobId, documentId);
    res.setHeader("Content-Type", file.contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${file.fileName}"`);
    res.download(file.filePath, file.fileName);
  }
}

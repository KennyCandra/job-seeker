import { Controller, Get, Post, Body, Query, Param, HttpCode, HttpStatus } from "@nestjs/common";
import { z } from "zod";
import { JobsService } from "./jobs.service";
import { ZodValidationPipe } from "../common/validation.pipe";
import { extractJobSchema } from "../common/dto";
import { AppException } from "../common/errors";

const filterCandidatesSchema = z.object({
  limit: z.number().optional(),
  force: z.boolean().optional(),
  companySlug: z.string().optional(),
  includeClosed: z.boolean().optional(),
});
const smartFilterAcceptedSchema = z.object({ force: z.boolean().optional() });

@Controller("jobs")
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Get()
  search(
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("search") search?: string,
    @Query("company") company?: string,
    @Query("status") status?: string,
    @Query("verdict") verdict?: string,
    @Query("smartVerdict") smartVerdict?: string,
    @Query("minScore") minScore?: string,
    @Query("fetchedWithinHours") fetchedWithinHours?: string,
  ) {
    return this.jobs.search({
      page, pageSize, search, company, status, verdict, smartVerdict, minScore, fetchedWithinHours,
    });
  }

  @Post("filter-candidates")
  filterCandidates(@Body(new ZodValidationPipe(filterCandidatesSchema)) body: { limit?: number; force?: boolean; companySlug?: string; includeClosed?: boolean }) {
    return this.jobs.filterCandidates(body).then((r) => ({ ok: true, ...r }));
  }

  @Post("smart-filter-accepted")
  smartFilterAccepted(@Body(new ZodValidationPipe(smartFilterAcceptedSchema)) body: { force?: boolean }) {
    return this.jobs.smartFilterAccepted(body?.force).then((r) => ({ ok: true, ...r }));
  }

  @Post("manual")
  @HttpCode(HttpStatus.CREATED)
  async manual(@Body(new ZodValidationPipe(extractJobSchema)) body: { text: string }) {
    const result = await this.jobs.manualFromText(body.text);
    return { ok: true, job: result.job, companySlug: result.companySlug };
  }

  @Get(":jobId")
  async detail(@Param("jobId") jobId: string) {
    const detail = await this.jobs.getDetail(jobId);
    if (!detail) {
      throw new AppException(404, "Job not found");
    }
    return detail;
  }

  @Post(":jobId/refetch")
  refetch(@Param("jobId") jobId: string) {
    return this.jobs.refetch(jobId).then((r) => ({ ok: true, jobId, ...r }));
  }

  @Post(":jobId/filter")
  filterJob(@Param("jobId") jobId: string) {
    return this.jobs.filterJob(jobId).then((r) => ({ ok: true, jobId, ...r }));
  }

  @Post(":jobId/smart-filter")
  smartFilterJob(@Param("jobId") jobId: string) {
    return this.jobs.smartFilterJob(jobId).then((r) => ({ ok: true, jobId, ...r }));
  }

  @Post(":jobId/application")
  createApplication(@Param("jobId") jobId: string) {
    return this.jobs.createApplication(jobId).then((r) => ({ ok: true, jobId, ...r }));
  }
}

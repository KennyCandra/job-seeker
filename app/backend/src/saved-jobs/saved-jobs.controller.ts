import { Controller, Get, Post, Param, Query } from "@nestjs/common";
import { SavedJobsService } from "../applications/applications.service";

@Controller("saved-jobs")
export class SavedJobsController {
  constructor(private readonly saved: SavedJobsService) {}

  @Get()
  getSavedJobs(@Query("limit") limit?: string) {
    return this.saved.getSavedJobs(limit);
  }

  @Get(":company")
  getSavedJobsByCompany(@Param("company") company: string, @Query("limit") limit?: string) {
    return this.saved.getSavedJobsByCompany(company, limit);
  }

  @Post(":companySlug/:jobId/filter")
  async filterSavedJob(@Param("companySlug") companySlug: string, @Param("jobId") jobId: string) {
    return this.saved.filterSavedJob(companySlug, jobId);
  }
}

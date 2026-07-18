import { Module } from "@nestjs/common";
import { SavedJobsController } from "./saved-jobs.controller";
import { SavedJobsService } from "../applications/applications.service";
import { RepositoriesModule } from "../database/repositories";
import { FilterModule } from "../filter/filter.module";

@Module({
  imports: [RepositoriesModule, FilterModule],
  controllers: [SavedJobsController],
  providers: [SavedJobsService],
  exports: [SavedJobsService],
})
export class SavedJobsModule {}

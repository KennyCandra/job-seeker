import { Module } from "@nestjs/common";
import { TasksModule } from "../tasks/tasks.module";
import { RepositoriesModule } from "../database/repositories";
import { JobsService } from "./jobs.service";
import { JobsIngestionService } from "./ingestion.service";
import { JobsController } from "./jobs.controller";

@Module({
  imports: [TasksModule, RepositoriesModule],
  controllers: [JobsController],
  providers: [JobsService, JobsIngestionService],
  exports: [JobsIngestionService, JobsService],
})
export class JobsModule {}

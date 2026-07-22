import { Module } from "@nestjs/common";
import { TasksModule } from "../tasks/tasks.module";
import { RepositoriesModule } from "../database/repositories";
import { PipelineTasksService } from "./pipeline.tasks";

/** Worker-only: registers the daily-pipeline task handler. */
@Module({
  imports: [TasksModule, RepositoriesModule],
  providers: [PipelineTasksService],
})
export class PipelineWorkerModule {}

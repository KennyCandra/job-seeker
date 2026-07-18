import { Module } from "@nestjs/common";
import { TasksModule } from "../tasks/tasks.module";
import { RepositoriesModule } from "../database/repositories";
import { FilterModule } from "../filter/filter.module";
import { ConfigModule as SearchConfigModule } from "../config/config.module";
import { JobsModule } from "./jobs.module";
import { JobsTasksService } from "./jobs.tasks";

@Module({
  imports: [TasksModule, RepositoriesModule, JobsModule, FilterModule, SearchConfigModule],
  providers: [JobsTasksService],
})
export class JobsWorkerModule {}

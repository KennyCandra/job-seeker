import { Module } from "@nestjs/common";
import { TasksModule } from "../tasks/tasks.module";
import { RepositoriesModule } from "../database/repositories";
import { ConfigModule } from "../config/config.module";
import { FilterModule } from "./filter.module";
import { FilterTasksService } from "./filter.tasks";

@Module({
  imports: [TasksModule, RepositoriesModule, ConfigModule, FilterModule],
  providers: [FilterTasksService],
})
export class FilterWorkerModule {}

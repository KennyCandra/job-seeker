import { Module } from "@nestjs/common";
import { TasksModule } from "../tasks/tasks.module";
import { RepositoriesModule } from "../database/repositories";
import { FilterModule } from "../filter/filter.module";
import { ApplicationsModule } from "./applications.module";
import { ApplicationsTasksService } from "./applications.service";

@Module({
  imports: [TasksModule, RepositoriesModule, FilterModule, ApplicationsModule],
  providers: [ApplicationsTasksService],
})
export class ApplicationsWorkerModule {}

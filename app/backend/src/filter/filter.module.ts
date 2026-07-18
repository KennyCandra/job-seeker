import { Module } from "@nestjs/common";
import { TasksModule } from "../tasks/tasks.module";
import { RepositoriesModule } from "../database/repositories";
import { ConfigModule } from "../config/config.module";
import { FilterService } from "./filter.service";

@Module({
  imports: [TasksModule, RepositoriesModule, ConfigModule],
  providers: [FilterService],
  exports: [FilterService],
})
export class FilterModule {}

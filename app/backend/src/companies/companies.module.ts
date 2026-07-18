import { Module } from "@nestjs/common";
import { TasksModule } from "../tasks/tasks.module";
import { RepositoriesModule } from "../database/repositories";
import { CompaniesService } from "./companies.service";
import { CompaniesController } from "./companies.controller";

@Module({
  imports: [TasksModule, RepositoriesModule],
  controllers: [CompaniesController],
  providers: [CompaniesService],
  exports: [CompaniesService],
})
export class CompaniesModule {}

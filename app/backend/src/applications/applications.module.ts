import { Module } from "@nestjs/common";
import { TasksModule } from "../tasks/tasks.module";
import { RepositoriesModule } from "../database/repositories";
import { FilterModule } from "../filter/filter.module";
import { DocumentsModule } from "../documents/documents.module";
import { ApplicationsService } from "./applications.service";
import { ApplicationsController } from "./applications.controller";

@Module({
  imports: [TasksModule, RepositoriesModule, FilterModule, DocumentsModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}

import { Module } from "@nestjs/common";
import { JobExtractController, CvController, PipelineController } from "./compat.controller";
import { DocumentsModule } from "../documents/documents.module";
import { TasksModule } from "../tasks/tasks.module";

@Module({
  imports: [DocumentsModule, TasksModule],
  controllers: [JobExtractController, CvController, PipelineController],
})
export class CompatModule {}

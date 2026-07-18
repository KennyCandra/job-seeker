import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { QueueCoreModule } from "../queue/queue.module";
import { TASK_QUEUE } from "../queue/constants";
import { TasksModule } from "./tasks.module";
import { RepositoriesModule } from "../database/repositories";
import { TaskProcessor } from "./task-processor";
import { TaskReaperService } from "./task-reaper.service";

@Module({
  imports: [QueueCoreModule, BullModule.registerQueue({ name: TASK_QUEUE }), TasksModule, RepositoriesModule],
  providers: [TaskProcessor, TaskReaperService],
})
export class TasksWorkerModule {}

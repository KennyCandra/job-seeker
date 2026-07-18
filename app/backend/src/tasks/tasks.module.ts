import { Global, Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { QueueCoreModule } from "../queue/queue.module";
import { TASK_QUEUE } from "../queue/constants";
import { TaskRegistry } from "./task-registry";
import { TaskQueueService } from "./task-queue.service";
import { TasksSseService } from "./sse.service";
import { TaskRunsService } from "./task-runs.service";
import { TasksController } from "./tasks.controller";

@Global()
@Module({
  imports: [QueueCoreModule, BullModule.registerQueue({ name: TASK_QUEUE })],
  controllers: [TasksController],
  providers: [TaskRegistry, TaskQueueService, TasksSseService, TaskRunsService],
  exports: [TaskRegistry, TaskQueueService, TasksSseService, TaskRunsService],
})
export class TasksModule {}

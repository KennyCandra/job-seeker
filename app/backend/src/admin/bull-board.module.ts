import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { BullBoardModule } from "@bull-board/nestjs";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { QueueCoreModule } from "../queue/queue.module";
import { TASK_QUEUE, APPLY_QUEUE } from "../queue/constants";

/**
 * Mounts the Bull Board dashboard at /admin/queues so the task and apply
 * queues can be inspected in the browser. The `/admin/*` path is excluded
 * from the global "api" prefix in main.ts, so it serves at the root.
 */
@Module({
  imports: [
    QueueCoreModule,
    BullModule.registerQueue({ name: TASK_QUEUE }, { name: APPLY_QUEUE }),
    BullBoardModule.forRoot({ route: "/admin/queues", adapter: ExpressAdapter }),
    BullBoardModule.forFeature(
      { name: TASK_QUEUE, adapter: BullMQAdapter },
      { name: APPLY_QUEUE, adapter: BullMQAdapter },
    ),
  ],
})
export class BullBoardAdminModule {}

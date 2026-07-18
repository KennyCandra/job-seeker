import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { QueueCoreModule } from "../queue/queue.module";
import { APPLY_QUEUE } from "../queue/constants";
import { RepositoriesModule } from "../database/repositories";
import { ApplyService } from "./apply.service";
import { ApplyController } from "./apply.controller";
import { ApplyControlService } from "./apply-control.service";

@Module({
  imports: [QueueCoreModule, BullModule.registerQueue({ name: APPLY_QUEUE }), RepositoriesModule],
  controllers: [ApplyController],
  providers: [ApplyService, ApplyControlService],
  exports: [ApplyService],
})
export class ApplyModule {}

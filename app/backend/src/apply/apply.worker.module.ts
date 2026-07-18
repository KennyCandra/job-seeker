import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { QueueCoreModule } from "../queue/queue.module";
import { APPLY_QUEUE } from "../queue/constants";
import { RepositoriesModule } from "../database/repositories";
import { ApplyProcessor } from "./apply.processor";
import { ApplyControlService } from "./apply-control.service";

@Module({
  imports: [QueueCoreModule, BullModule.registerQueue({ name: APPLY_QUEUE }), RepositoriesModule],
  providers: [ApplyProcessor, ApplyControlService],
})
export class ApplyWorkerModule {}

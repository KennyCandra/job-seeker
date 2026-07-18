import { Global, Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { ConfigService } from "@nestjs/config";
import type { EnvConfig } from "../config/env";

@Global()
@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvConfig>) => ({
        connection: { url: config.get("REDIS_URL", { infer: true }) },
      }),
    }),
  ],
  exports: [BullModule],
})
export class QueueCoreModule {}

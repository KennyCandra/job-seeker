import { Module } from "@nestjs/common";
import { TasksModule } from "../tasks/tasks.module";
import { RepositoriesModule } from "../database/repositories";
import { ConfigModule } from "../config/config.module";
import { DiscoveryService } from "./discovery.service";

@Module({
  imports: [TasksModule, RepositoriesModule, ConfigModule],
  providers: [DiscoveryService],
  exports: [DiscoveryService],
})
export class DiscoveryModule {}

import { Module } from "@nestjs/common";
import { TasksModule } from "../tasks/tasks.module";
import { RepositoriesModule } from "../database/repositories";
import { ConfigModule } from "../config/config.module";
import { DiscoveryModule } from "./discovery.module";
import { DiscoveryTasksService } from "./discovery.tasks";

@Module({
  imports: [TasksModule, RepositoriesModule, ConfigModule, DiscoveryModule],
  providers: [DiscoveryTasksService],
})
export class DiscoveryWorkerModule {}

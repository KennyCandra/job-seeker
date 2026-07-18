import { Module } from "@nestjs/common";
import { AppConfigModule } from "./config/app-config.module";
import { DatabaseModule } from "./database/database.module";
import { TasksModule } from "./tasks/tasks.module";
import { RepositoriesModule } from "./database/repositories";
import { CompaniesModule } from "./companies/companies.module";
import { JobsModule } from "./jobs/jobs.module";
import { FilterModule } from "./filter/filter.module";
import { DiscoveryModule } from "./discovery/discovery.module";
import { ProfileModule } from "./profile/profile.module";
import { ApplicationsModule } from "./applications/applications.module";
import { DocumentsModule } from "./documents/documents.module";
import { TasksWorkerModule } from "./tasks/tasks.worker.module";
import { JobsWorkerModule } from "./jobs/jobs.worker.module";
import { FilterWorkerModule } from "./filter/filter.worker.module";
import { DiscoveryWorkerModule } from "./discovery/discovery.worker.module";
import { ApplicationsWorkerModule } from "./applications/applications.worker.module";
import { ApplyWorkerModule } from "./apply/apply.worker.module";
import { SchedulerModule } from "./scheduler/scheduler.module";

@Module({
  imports: [
    AppConfigModule,
    DatabaseModule,
    TasksModule,
    RepositoriesModule,
    CompaniesModule,
    JobsModule,
    FilterModule,
    DiscoveryModule,
    ProfileModule,
    ApplicationsModule,
    DocumentsModule,
    TasksWorkerModule,
    JobsWorkerModule,
    FilterWorkerModule,
    DiscoveryWorkerModule,
    ApplicationsWorkerModule,
    ApplyWorkerModule,
    SchedulerModule,
  ],
})
export class WorkerModule {}

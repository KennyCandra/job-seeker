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
import { SavedJobsModule } from "./saved-jobs/saved-jobs.module";
import { DocumentsModule } from "./documents/documents.module";
import { StatsModule } from "./stats/stats.module";
import { ConfigModule } from "./config/config.module";
import { ShortlistModule } from "./shortlist/shortlist.module";
import { ApplyModule } from "./apply/apply.module";
import { CompatModule } from "./compat/compat.module";
import { FrontendModule } from "./frontend.module";
import { BullBoardAdminModule } from "./admin/bull-board.module";
import { HealthController } from "./health.controller";

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
    SavedJobsModule,
    DocumentsModule,
    StatsModule,
    ConfigModule,
    ShortlistModule,
    ApplyModule,
    CompatModule,
    BullBoardAdminModule,
    FrontendModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}

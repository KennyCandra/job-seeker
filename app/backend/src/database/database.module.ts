import { Global, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import type { EnvConfig } from "../config/env";
import {
  Company,
  Job,
  JobFilterEntity,
  Application,
  ApplicationRun,
  ApplicationRunStep,
  JobDocument,
  SearchConfigEntity,
  TaskRun,
  TaskRunLog,
  UserProfile,
  UserAnswer,
  CompanySnapshot,
} from "./entities";
import { RepositoriesModule } from "./repositories";

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvConfig>) => ({
        type: "postgres",
        url: config.get("DATABASE_URL", { infer: true }),
        entities: [
          Company,
          Job,
          JobFilterEntity,
          Application,
          ApplicationRun,
          ApplicationRunStep,
          JobDocument,
          SearchConfigEntity,
          TaskRun,
          TaskRunLog,
          UserProfile,
          UserAnswer,
          CompanySnapshot,
        ],
        synchronize: false,
        extra: {
          max: config.get("DATABASE_POOL_SIZE", { infer: true }),
        },
      }),
    }),
    RepositoriesModule,
  ],
  exports: [RepositoriesModule],
})
export class DatabaseModule {}

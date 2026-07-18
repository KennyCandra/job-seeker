import { Module } from "@nestjs/common";
import { RepositoriesModule } from "../database/repositories";
import { ConfigService } from "./config.service";
import { SearchConfigService } from "./search-config.service";
import { ConfigController } from "./config.controller";

@Module({
  imports: [RepositoriesModule],
  controllers: [ConfigController],
  providers: [ConfigService, SearchConfigService],
  exports: [ConfigService, SearchConfigService],
})
export class ConfigModule {}

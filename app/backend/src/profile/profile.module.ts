import { Module } from "@nestjs/common";
import { RepositoriesModule } from "../database/repositories";
import { ProfileService } from "./profile.service";
import { ProfileController } from "./profile.controller";

@Module({
  imports: [RepositoriesModule],
  controllers: [ProfileController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}

import { Module } from "@nestjs/common";
import { RepositoriesModule } from "../database/repositories";
import { ShortlistController } from "./shortlist.controller";

@Module({
  imports: [RepositoriesModule],
  controllers: [ShortlistController],
})
export class ShortlistModule {}

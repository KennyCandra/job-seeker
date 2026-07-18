import { Module } from "@nestjs/common";
import { RepositoriesModule } from "../database/repositories";
import { GeneratorService } from "./generator.service";
import { LatexService } from "./latex.service";
import { DocumentsController } from "./documents.controller";

@Module({
  imports: [RepositoriesModule],
  controllers: [DocumentsController],
  providers: [GeneratorService, LatexService],
  exports: [GeneratorService, LatexService],
})
export class DocumentsModule {}

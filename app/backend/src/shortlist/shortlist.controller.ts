import { Controller, Get, Delete, Param } from "@nestjs/common";
import { ShortlistRepository } from "../database/repositories";

@Controller("shortlist")
export class ShortlistController {
  constructor(private readonly shortlist: ShortlistRepository) {}

  @Get()
  getAll() {
    return this.shortlist.getAll();
  }

  @Delete(":jobId")
  delete(@Param("jobId") jobId: string) {
    return this.shortlist.delete(jobId).then(() => ({ ok: true }));
  }
}

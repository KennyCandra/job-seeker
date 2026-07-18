import { Controller, Get, Post, Patch, Delete, Body, Param } from "@nestjs/common";
import { z } from "zod";
import { CompaniesService } from "./companies.service";
import { ZodValidationPipe } from "../common/validation.pipe";
import { createCompanySchema } from "../common/dto";
import type { AtsPlatform } from "../shared/types";

const setActiveSchema = z.object({ active: z.boolean() });
const fetchSchema = z.object({ filter: z.boolean().optional() });

@Controller("companies")
export class CompaniesController {
  constructor(private readonly companies: CompaniesService) {}

  @Get()
  getAll() {
    return this.companies.getAll();
  }

  @Post("discover")
  discover() {
    return this.companies.discover().then((r) => ({ ok: true, ...r }));
  }

  @Post("ln")
  discoverLegacy() {
    return this.companies.discoverLegacy().then((r) => ({ ok: true, ...r }));
  }

  @Post()
  create(@Body(new ZodValidationPipe(createCompanySchema)) body: { name: string; ats: AtsPlatform; boardUrl?: string; endpoint?: string }) {
    return this.companies.create(body);
  }

  @Patch(":slug/active")
  setActive(@Param("slug") slug: string, @Body(new ZodValidationPipe(setActiveSchema)) body: { active: boolean }) {
    return this.companies.setActive(slug, Boolean(body.active));
  }

  @Delete(":slug")
  remove(@Param("slug") slug: string) {
    return this.companies.remove(slug);
  }

  @Post(":slug/fetch")
  fetch(@Param("slug") slug: string, @Body(new ZodValidationPipe(fetchSchema)) body: { filter?: boolean }) {
    return this.companies.fetch(slug, body?.filter).then((r) => ({ ok: true, company: slug, ...r }));
  }
}

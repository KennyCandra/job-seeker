import { Controller, Get, Put, Body } from "@nestjs/common";
import { ConfigService } from "./config.service";
import type { SearchConfigDto } from "./config.service";
import { ZodValidationPipe } from "../common/validation.pipe";
import { putConfigSchema } from "../common/dto";

@Controller("config")
export class ConfigController {
  constructor(private readonly config: ConfigService) {}

  @Get()
  get() {
    return this.config.get();
  }

  @Get("search")
  getSearch() {
    return this.config.get();
  }

  @Put()
  async put(@Body(new ZodValidationPipe(putConfigSchema)) body: SearchConfigDto) {
    await this.config.save(body);
    return { ok: true };
  }
}

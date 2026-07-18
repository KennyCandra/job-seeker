import { OpenCodeClient } from "./llm";
import { ConfigService } from "@nestjs/config";
import type { EnvConfig } from "../config/env";

export function createClient(config?: ConfigService<EnvConfig>): OpenCodeClient {
  if (config) {
    return OpenCodeClient.fromConfig(config);
  }
  return new OpenCodeClient();
}

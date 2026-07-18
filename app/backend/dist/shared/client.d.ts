import { OpenCodeClient } from "./llm";
import { ConfigService } from "@nestjs/config";
import type { EnvConfig } from "../config/env";
export declare function createClient(config?: ConfigService<EnvConfig>): OpenCodeClient;

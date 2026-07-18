import { ConfigService } from "@nestjs/config";
import { CompaniesRepository } from "../database/repositories";
import { SearchConfigService } from "../config/search-config.service";
import type { EnvConfig } from "../config/env";
type DiscoveryProgress = (p: {
    type: string;
    message: string;
}) => void;
export declare class DiscoveryService {
    private readonly companies;
    private readonly config;
    private readonly envConfig;
    private readonly logger;
    constructor(companies: CompaniesRepository, config: SearchConfigService, envConfig: ConfigService<EnvConfig>);
    private detectAts;
    private slugify;
    discover(onProgress?: DiscoveryProgress): Promise<{
        source: string;
        found: number;
        added: number;
        updated: number;
        queries: string[];
        companies: number;
    }>;
}
export {};

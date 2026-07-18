import { ConfigService } from "./config.service";
import type { SearchConfigDto } from "./config.service";
export declare class ConfigController {
    private readonly config;
    constructor(config: ConfigService);
    get(): Promise<SearchConfigDto>;
    getSearch(): Promise<SearchConfigDto>;
    put(body: SearchConfigDto): Promise<{
        ok: boolean;
    }>;
}

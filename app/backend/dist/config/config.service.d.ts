import { SearchConfigRepository } from "../database/repositories";
export type SearchConfigDto = {
    roles: string[];
    location: string[];
    exclude: string[];
    ats: string[];
    min_score: number;
    discovery_interval_hours: number;
    targetCompanies: string[];
};
export declare class ConfigService {
    private readonly repo;
    constructor(repo: SearchConfigRepository);
    get(): Promise<SearchConfigDto>;
    save(config: SearchConfigDto): Promise<void>;
}

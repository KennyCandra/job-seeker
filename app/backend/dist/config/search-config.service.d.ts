import { SearchConfigRepository } from "../database/repositories";
import type { SearchConfigDto } from "./config.service";
export type SearchConfig = SearchConfigDto;
export declare class SearchConfigService {
    private readonly repo;
    constructor(repo: SearchConfigRepository);
    load(): Promise<SearchConfig>;
}

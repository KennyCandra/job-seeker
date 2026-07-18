import { Injectable } from "@nestjs/common";
import { SearchConfigRepository } from "../database/repositories";
import type { SearchConfigDto } from "./config.service";

export type SearchConfig = SearchConfigDto;

const DEFAULT_CONFIG: SearchConfig = {
  roles: [],
  location: [],
  ats: [],
  exclude: [],
  min_score: 65,
  discovery_interval_hours: 24,
  targetCompanies: [],
};

@Injectable()
export class SearchConfigService {
  constructor(private readonly repo: SearchConfigRepository) {}

  async load(): Promise<SearchConfig> {
    const row = await this.repo.getDefault();
    if (!row) return { ...DEFAULT_CONFIG };
    try {
      const parsed = JSON.parse(row.value) as Partial<SearchConfig>;
      return {
        roles: parsed.roles ?? [],
        location: parsed.location ?? [],
        ats: parsed.ats ?? [],
        exclude: parsed.exclude ?? [],
        min_score: Number.isFinite(Number(parsed.min_score)) ? Number(parsed.min_score) : 65,
        discovery_interval_hours: Number.isFinite(Number(parsed.discovery_interval_hours)) ? Number(parsed.discovery_interval_hours) : 24,
        targetCompanies: parsed.targetCompanies ?? [],
      };
    } catch {
      return { ...DEFAULT_CONFIG };
    }
  }
}

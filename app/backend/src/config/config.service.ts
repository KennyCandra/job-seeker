import { Injectable } from "@nestjs/common";
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

const DEFAULT: SearchConfigDto = {
  roles: [],
  location: [],
  exclude: [],
  ats: [],
  min_score: 65,
  discovery_interval_hours: 24,
  targetCompanies: [],
};

@Injectable()
export class ConfigService {
  constructor(private readonly repo: SearchConfigRepository) {}

  async get(): Promise<SearchConfigDto> {
    const row = await this.repo.getDefault();
    if (!row) return { ...DEFAULT };
    try {
      const parsed = JSON.parse(row.value) as Partial<SearchConfigDto>;
      return {
        roles: parsed.roles ?? [],
        location: parsed.location ?? [],
        exclude: parsed.exclude ?? [],
        ats: parsed.ats ?? [],
        min_score: Number.isFinite(Number(parsed.min_score)) ? Number(parsed.min_score) : 65,
        discovery_interval_hours: Number.isFinite(Number(parsed.discovery_interval_hours)) ? Number(parsed.discovery_interval_hours) : 24,
        targetCompanies: parsed.targetCompanies ?? [],
      };
    } catch {
      return { ...DEFAULT };
    }
  }

  async save(config: SearchConfigDto): Promise<void> {
    const value: SearchConfigDto = {
      roles: config.roles ?? [],
      location: config.location ?? [],
      exclude: config.exclude ?? [],
      ats: config.ats ?? [],
      min_score: Number.isFinite(Number(config.min_score)) ? Number(config.min_score) : 65,
      discovery_interval_hours: Number.isFinite(Number(config.discovery_interval_hours)) ? Number(config.discovery_interval_hours) : 24,
      targetCompanies: config.targetCompanies ?? [],
    };
    await this.repo.save("default", JSON.stringify(value));
  }
}

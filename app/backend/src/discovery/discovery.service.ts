import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CompaniesRepository } from "../database/repositories";
import { SearchConfigService } from "../config/search-config.service";
import { endpointForAts } from "../common/paths";
import type { AtsPlatform } from "../shared/types";
import type { EnvConfig } from "../config/env";

type DiscoveryProgress = (p: { type: string; message: string }) => void;

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);

  constructor(
    private readonly companies: CompaniesRepository,
    private readonly config: SearchConfigService,
    private readonly envConfig: ConfigService<EnvConfig>,
  ) {}

  private detectAts(url: string): AtsPlatform | null {
    const u = url.toLowerCase();
    if (u.includes("greenhouse.io")) return "greenhouse";
    if (u.includes("lever.co")) return "lever";
    if (u.includes("ashbyhq.com")) return "ashby";
    return null;
  }

  private slugify(name: string): string {
    return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "company";
  }

  async discover(onProgress?: DiscoveryProgress): Promise<{
    source: string;
    found: number;
    added: number;
    updated: number;
    queries: string[];
    companies: number;
  }> {
    const cfg = await this.config.load();
    const roles = cfg.roles.length ? cfg.roles : ["backend engineer"];
    const queries = roles.map((role) => `${role} careers remote europe`);
    const apiKey =
      this.envConfig.get("SERPAPI_KEY", { infer: true }) || this.envConfig.get("SERP_API_KEY", { infer: true }) || "";

    if (!apiKey) {
      this.logger.warn("[discovery] No SERPAPI_KEY configured; skipping live discovery");
      onProgress?.({ type: "warn", message: "No SERPAPI_KEY configured; discovery skipped" });
      return { source: "none", found: 0, added: 0, updated: 0, queries, companies: 0 };
    }

    let found = 0;
    let added = 0;
    let updated = 0;

    for (const query of queries) {
      onProgress?.({ type: "info", message: `Searching: ${query}` });
      try {
        const url = `https://serpapi.com/search.json?engine=google&q=${encodeURIComponent(query)}&num=20&api_key=${apiKey}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
        if (!res.ok) {
          this.logger.warn(`[discovery] SerpAPI ${res.status} for ${query}`);
          continue;
        }
        const data = (await res.json()) as any;
        const results: any[] = data.organic_results || [];
        for (const r of results) {
          const link: string = r.link || "";
          const ats = this.detectAts(link);
          if (!ats) continue;
          const name = (r.title || "").split(/[-|]/)[0]?.trim() || this.slugify(link);
          if (!name) continue;
          found++;
          const slug = this.slugify(name);
          const existing = await this.companies.getBySlug(slug);
          if (!existing) {
            await this.companies.save({ slug, name, ats, endpoint: endpointForAts(slug, ats) });
            added++;
            onProgress?.({ type: "added", message: `Added ${name} (${ats})` });
          } else {
            updated++;
          }
        }
      } catch (err: any) {
        this.logger.warn(`[discovery] error for ${query}: ${err?.message ?? err}`);
      }
    }

    return { source: "serpapi", found, added, updated, queries, companies: found };
  }
}

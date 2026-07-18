"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var DiscoveryService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscoveryService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const repositories_1 = require("../database/repositories");
const search_config_service_1 = require("../config/search-config.service");
const paths_1 = require("../common/paths");
let DiscoveryService = DiscoveryService_1 = class DiscoveryService {
    companies;
    config;
    envConfig;
    logger = new common_1.Logger(DiscoveryService_1.name);
    constructor(companies, config, envConfig) {
        this.companies = companies;
        this.config = config;
        this.envConfig = envConfig;
    }
    detectAts(url) {
        const u = url.toLowerCase();
        if (u.includes("greenhouse.io"))
            return "greenhouse";
        if (u.includes("lever.co"))
            return "lever";
        if (u.includes("ashbyhq.com"))
            return "ashby";
        return null;
    }
    slugify(name) {
        return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "company";
    }
    async discover(onProgress) {
        const cfg = await this.config.load();
        const roles = cfg.roles.length ? cfg.roles : ["backend engineer"];
        const queries = roles.map((role) => `${role} careers remote europe`);
        const apiKey = this.envConfig.get("SERPAPI_KEY", { infer: true }) || this.envConfig.get("SERP_API_KEY", { infer: true }) || "";
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
                const data = (await res.json());
                const results = data.organic_results || [];
                for (const r of results) {
                    const link = r.link || "";
                    const ats = this.detectAts(link);
                    if (!ats)
                        continue;
                    const name = (r.title || "").split(/[-|]/)[0]?.trim() || this.slugify(link);
                    if (!name)
                        continue;
                    found++;
                    const slug = this.slugify(name);
                    const existing = await this.companies.getBySlug(slug);
                    if (!existing) {
                        await this.companies.save({ slug, name, ats, endpoint: (0, paths_1.endpointForAts)(slug, ats) });
                        added++;
                        onProgress?.({ type: "added", message: `Added ${name} (${ats})` });
                    }
                    else {
                        updated++;
                    }
                }
            }
            catch (err) {
                this.logger.warn(`[discovery] error for ${query}: ${err?.message ?? err}`);
            }
        }
        return { source: "serpapi", found, added, updated, queries, companies: found };
    }
};
exports.DiscoveryService = DiscoveryService;
exports.DiscoveryService = DiscoveryService = DiscoveryService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [repositories_1.CompaniesRepository,
        search_config_service_1.SearchConfigService,
        config_1.ConfigService])
], DiscoveryService);
//# sourceMappingURL=discovery.service.js.map
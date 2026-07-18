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
var JobsIngestionService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobsIngestionService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("typeorm");
const repositories_1 = require("../database/repositories");
const sources_1 = require("./ats/sources");
const migration_probe_1 = require("./ats/migration-probe");
const errors_1 = require("../common/errors");
function genId(prefix) {
    return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}
let JobsIngestionService = JobsIngestionService_1 = class JobsIngestionService {
    dataSource;
    companies;
    jobs;
    logger = new common_1.Logger(JobsIngestionService_1.name);
    constructor(dataSource, companies, jobs) {
        this.dataSource = dataSource;
        this.companies = companies;
        this.jobs = jobs;
    }
    async ingestCompanyJobs(company, rawJobs) {
        const base = {
            companyId: company.id,
            companySlug: company.slug,
            companyName: company.name,
            ats: company.ats,
            fetched: 0,
            newCount: 0,
            changedCount: 0,
            unchangedCount: 0,
            closedCount: 0,
            newJobIds: [],
            changedJobIds: [],
        };
        if (company.ats === "custom")
            return base;
        const source = (0, sources_1.getSource)(company.endpoint);
        const seenExternalIds = [];
        for (const raw of rawJobs) {
            const norm = await source.normalize(raw.raw, company);
            const externalId = String(norm.externalId ?? raw.id);
            const jobId = `${company.ats}-${externalId}`;
            seenExternalIds.push(externalId);
            const hash = this.jobs.computeContentHash({
                title: norm.title ?? "",
                location: norm.location ?? "",
                url: norm.applyUrl ?? "",
                description: norm.description ?? "",
                rawJson: raw.raw,
            });
            const existing = await this.jobs.get(company.slug, externalId);
            if (existing) {
                if (existing.contentHash !== hash) {
                    base.changedCount++;
                    base.changedJobIds.push(jobId);
                }
            }
            else {
                base.newCount++;
                base.newJobIds.push(jobId);
            }
            await this.jobs.save({
                id: jobId,
                companyId: company.id,
                externalId,
                url: norm.applyUrl ?? "",
                title: norm.title ?? "",
                location: norm.location ?? "",
                description: norm.description ?? "",
                rawJson: raw.raw,
                status: "open",
            });
        }
        base.fetched = rawJobs.length;
        base.closedCount = await this.jobs.markClosedMissing(company.id, seenExternalIds);
        return base;
    }
    async syncCompany(company, ctx) {
        if (company.ats === "custom") {
            return {
                companyId: company.id,
                companySlug: company.slug,
                companyName: company.name,
                ats: company.ats,
                fetched: 0,
                newCount: 0,
                changedCount: 0,
                unchangedCount: 0,
                closedCount: 0,
                newJobIds: [],
                changedJobIds: [],
            };
        }
        await new Promise((r) => setTimeout(r, 300 + Math.random() * 600));
        const source = (0, sources_1.getSource)(company.endpoint);
        const rawJobs = await source.pullJobs(company.endpoint);
        const result = await this.ingestCompanyJobs(company, rawJobs);
        await this.companies.updateFetchedAt(company.slug);
        return result;
    }
    async createManualJob(payload) {
        const companySlug = payload.companySlug || "manual";
        return this.dataSource.transaction(async (manager) => {
            let company = await this.companies.getBySlug(companySlug);
            if (!company) {
                await this.companies.save({ slug: companySlug, name: companySlug, ats: "custom" }, manager);
                company = await this.companies.getBySlug(companySlug);
            }
            if (!company)
                throw new errors_1.AppException(500, `Failed to create company ${companySlug}`);
            const jobId = genId("manual");
            await this.jobs.save({
                id: jobId,
                companyId: company.id,
                externalId: jobId,
                url: payload.url ?? "",
                title: payload.title,
                location: payload.location ?? "",
                description: payload.description ?? payload.rawText ?? "",
                rawJson: { manual: true },
                status: "open",
            }, manager);
            return { jobId, companySlug };
        });
    }
    async refetchJob(jobId, ctx) {
        const saved = await this.jobs.getById(jobId);
        if (!saved)
            throw new errors_1.AppException(404, `Job not found: ${jobId}`);
        const company = await this.companies.getById(saved.companyId);
        if (!company)
            throw new errors_1.AppException(404, `Company not found for job: ${jobId}`);
        if (company.ats === "custom")
            throw new errors_1.AppException(400, "Manual jobs cannot be refetched");
        const source = (0, sources_1.getSource)(company.endpoint);
        const raw = await source.pullJob(company.endpoint, saved.externalId);
        if (!raw)
            throw new errors_1.AppException(404, `Job ${jobId} not found at source`);
        const norm = await source.normalize(raw, company);
        await this.jobs.save({
            id: jobId,
            companyId: saved.companyId,
            externalId: saved.externalId,
            url: norm.applyUrl ?? saved.url,
            title: norm.title ?? saved.title,
            location: norm.location ?? saved.location,
            description: norm.description ?? saved.description,
            rawJson: raw,
            status: "open",
        });
        return { jobId, source: "company_endpoint" };
    }
    async detectMigration(companySlug, prevAts, ctx) {
        const company = await this.companies.getBySlug(companySlug);
        if (!company)
            throw new errors_1.AppException(404, `Company not found: ${companySlug}`);
        const { match, attempts } = await (0, migration_probe_1.detectAtsMigration)(companySlug, prevAts);
        for (const attempt of attempts) {
            if (ctx?.log) {
                await ctx.log("info", `Candidate ${attempt.ats} (${attempt.endpoint}): ${attempt.matched ? "matched" : "no match"}`);
            }
        }
        if (!match) {
            if (ctx?.log) {
                await ctx.log("warn", `No ATS migration match found for ${companySlug}; tried ${attempts.map((a) => a.ats).join(", ") || "no candidates"}`);
            }
            return { detected: false, attempted: attempts.map((a) => a.ats) };
        }
        if (ctx?.log) {
            await ctx.log("info", `Detected ${companySlug} migrated from ${prevAts} to ${match.ats} at ${match.endpoint}`);
        }
        const virtualCompany = { ...company, ats: match.ats, endpoint: match.endpoint };
        const result = await this.ingestCompanyJobs(virtualCompany, match.rawJobs);
        await this.companies.updateAts(companySlug, match.ats, match.endpoint);
        await this.companies.reactivate(companySlug);
        await this.companies.updateFetchedAt(companySlug);
        if (ctx?.log) {
            await ctx.log("info", `Ingested ${result.fetched} jobs from ${match.ats} (${result.newCount} new, ${result.changedCount} changed, ${result.closedCount} closed)`);
        }
        return { detected: true, ats: match.ats, endpoint: match.endpoint, fetched: result.fetched };
    }
};
exports.JobsIngestionService = JobsIngestionService;
exports.JobsIngestionService = JobsIngestionService = JobsIngestionService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [typeorm_1.DataSource,
        repositories_1.CompaniesRepository,
        repositories_1.JobsRepository])
], JobsIngestionService);
//# sourceMappingURL=ingestion.service.js.map
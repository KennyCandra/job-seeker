import { Injectable, Logger } from "@nestjs/common";
import { DataSource } from "typeorm";
import { CompaniesRepository, JobsRepository } from "../database/repositories";
import { getSource } from "./ats/sources";
import { detectAtsMigration } from "./ats/migration-probe";
import { AppException } from "../common/errors";
import type { CompanyRecord, AtsPlatform } from "../shared/types";
import type { RawJob } from "./ats/types";
import type { TaskHandlerContext } from "../tasks/types";

function genId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export type CompanyFetchResult = {
  companyId: number;
  companySlug: string;
  companyName: string;
  ats: string;
  fetched: number;
  newCount: number;
  changedCount: number;
  unchangedCount: number;
  closedCount: number;
  newJobIds: string[];
  changedJobIds: string[];
  error?: string;
};

export type DetectMigrationResult = {
  detected: boolean;
  ats?: string;
  endpoint?: string;
  fetched?: number;
  attempted?: string[];
};

@Injectable()
export class JobsIngestionService {
  private readonly logger = new Logger(JobsIngestionService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly companies: CompaniesRepository,
    private readonly jobs: JobsRepository,
  ) {}

  /**
   * Normalizes, hashes, persists and marks-closed a batch of already-fetched
   * raw jobs for a company. Pure ingestion — never performs a network fetch —
   * so both a normal sync and a migration detection can share it and never
   * make a duplicate request against the ATS.
   */
  async ingestCompanyJobs(company: CompanyRecord, rawJobs: RawJob[]): Promise<CompanyFetchResult> {
    const base: CompanyFetchResult = {
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

    if (company.ats === "custom") return base;

    const source = getSource(company.endpoint);
    const seenExternalIds: string[] = [];

    for (const raw of rawJobs) {
      const norm = await source.normalize(raw.raw, company as any);
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
      } else {
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

  async syncCompany(company: CompanyRecord, ctx?: TaskHandlerContext): Promise<CompanyFetchResult> {
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

    // Small jitter before hitting the ATS endpoint. With sync-all-jobs now
    // fanning out to concurrent per-company tasks (see JobsTasksService),
    // there's no longer a shared sequential loop to space requests out —
    // this keeps concurrent fetches from landing on an ATS in the same instant.
    await new Promise((r) => setTimeout(r, 300 + Math.random() * 600));

    const source = getSource(company.endpoint);
    const rawJobs = await source.pullJobs(company.endpoint);
    const result = await this.ingestCompanyJobs(company, rawJobs);
    await this.companies.updateFetchedAt(company.slug);
    return result;
  }

  async createManualJob(payload: {
    companySlug: string;
    title: string;
    location?: string;
    url?: string;
    description?: string;
    rawText?: string;
  }): Promise<{ jobId: string; companySlug: string }> {
    const companySlug = payload.companySlug || "manual";
    return this.dataSource.transaction(async (manager) => {
      let company = await this.companies.getBySlug(companySlug);
      if (!company) {
        await this.companies.save({ slug: companySlug, name: companySlug, ats: "custom" }, manager);
        company = await this.companies.getBySlug(companySlug);
      }
      if (!company) throw new AppException(500, `Failed to create company ${companySlug}`);

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

  async refetchJob(jobId: string, ctx?: TaskHandlerContext): Promise<{ jobId: string; source: string }> {
    const saved = await this.jobs.getById(jobId);
    if (!saved) throw new AppException(404, `Job not found: ${jobId}`);
    const company = await this.companies.getById(saved.companyId);
    if (!company) throw new AppException(404, `Company not found for job: ${jobId}`);
    if (company.ats === "custom") throw new AppException(400, "Manual jobs cannot be refetched");

    const source = getSource(company.endpoint);
    const raw = await source.pullJob(company.endpoint, saved.externalId);
    if (!raw) throw new AppException(404, `Job ${jobId} not found at source`);
    const norm = await source.normalize(raw, company as any);

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

  /**
   * Tries every ATS platform except prevAts for a canonical endpoint that
   * responds with a validly-shaped jobs payload, stopping at the first match.
   * The company row is only updated (ats/endpoint/active) after the fetched
   * jobs have been successfully ingested — never before.
   */
  async detectMigration(companySlug: string, prevAts: AtsPlatform, ctx?: TaskHandlerContext): Promise<DetectMigrationResult> {
    const company = await this.companies.getBySlug(companySlug);
    if (!company) throw new AppException(404, `Company not found: ${companySlug}`);

    const { match, attempts } = await detectAtsMigration(companySlug, prevAts);
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

    // Ingest against a virtual copy reflecting the new ATS/endpoint so job
    // IDs and normalization use the correct platform. The real company row
    // is only mutated once this succeeds.
    const virtualCompany: CompanyRecord = { ...company, ats: match.ats, endpoint: match.endpoint };
    const result = await this.ingestCompanyJobs(virtualCompany, match.rawJobs);

    await this.companies.updateAts(companySlug, match.ats, match.endpoint);
    await this.companies.reactivate(companySlug);
    await this.companies.updateFetchedAt(companySlug);

    if (ctx?.log) {
      await ctx.log(
        "info",
        `Ingested ${result.fetched} jobs from ${match.ats} (${result.newCount} new, ${result.changedCount} changed, ${result.closedCount} closed)`,
      );
    }

    return { detected: true, ats: match.ats, endpoint: match.endpoint, fetched: result.fetched };
  }
}

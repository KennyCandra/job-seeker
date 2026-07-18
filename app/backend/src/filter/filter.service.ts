import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JobsRepository, JobFiltersRepository } from "../database/repositories";
import { OpenCodeClient } from "../shared/llm";
import { buildFilterPrompt } from "../shared/prompts";
import { readText } from "../shared/utils";
import { SKILLS_DIR } from "../common/paths";
import type { SearchConfig } from "../config/search-config.service";
import type { EnvConfig } from "../config/env";

export const NORMAL_FILTER_PROMPT_VERSION = "normal-filter-scoring-v1";
export const SMART_FILTER_PROMPT_VERSION = "smart-filter-v1";

export type FilterResult = {
  verdict: "accept" | "reject";
  score: number;
  reasons: string[];
  must_have_hits: string[];
  missing: string[];
};

export type FilteredJob = { job: any; filter: FilterResult };

export type JobRecordLite = {
  id: string;
  site: string;
  title: string;
  company: string;
  location: string;
  url: string;
  description: string;
};

type WeightedTerm = { term: string; weight: number };

const HARD_REJECT_TITLE_TERMS = [
  "staff", "principal", "director", "head of", "engineering manager", "product manager",
  "project manager", "qa engineer", "manual qa", "data scientist", "data analyst",
  "ios engineer", "android engineer", "mobile engineer", "wordpress developer", "php developer",
];

const HARD_REJECT_TEXT_TERMS = [
  "internship", "working student", "student worker", "unpaid", "volunteer", "commission only",
  "native german", "native french", "native dutch", "fluent german required",
  "security clearance", "active clearance", "secret clearance", "top secret clearance",
  "us citizen", "u.s. citizen",
];

const TITLE_STRONG_TERMS: WeightedTerm[] = [
  { term: "backend engineer", weight: 42 }, { term: "back end engineer", weight: 42 }, { term: "back-end engineer", weight: 42 },
  { term: "backend developer", weight: 38 }, { term: "back end developer", weight: 38 }, { term: "back-end developer", weight: 38 },
  { term: "node.js engineer", weight: 38 }, { term: "node engineer", weight: 36 }, { term: "typescript engineer", weight: 34 },
  { term: "api engineer", weight: 32 },
];

const TITLE_GOOD_TERMS: WeightedTerm[] = [
  { term: "software engineer", weight: 30 }, { term: "software developer", weight: 28 },
  { term: "fullstack engineer", weight: 30 }, { term: "full stack engineer", weight: 30 }, { term: "full-stack engineer", weight: 30 },
  { term: "fullstack developer", weight: 28 }, { term: "full stack developer", weight: 28 }, { term: "full-stack developer", weight: 28 },
  { term: "platform engineer", weight: 24 }, { term: "web engineer", weight: 18 }, { term: "web developer", weight: 16 },
];

const TITLE_PENALTY_TERMS: WeightedTerm[] = [
  { term: "senior", weight: -12 }, { term: "sr", weight: -12 }, { term: "lead", weight: -18 },
  { term: "manager", weight: -28 }, { term: "architect", weight: -24 }, { term: "frontend", weight: -16 },
  { term: "front end", weight: -16 }, { term: "front-end", weight: -16 }, { term: "react native", weight: -24 },
  { term: "mobile", weight: -30 }, { term: "ios", weight: -30 }, { term: "android", weight: -30 },
];

const REQUIRED_TECH_TERMS: WeightedTerm[] = [
  { term: "node.js", weight: 12 }, { term: "nodejs", weight: 12 }, { term: "node", weight: 10 },
  { term: "typescript", weight: 12 }, { term: "javascript", weight: 8 }, { term: "postgresql", weight: 12 },
  { term: "postgres", weight: 12 }, { term: "rest api", weight: 10 }, { term: "api", weight: 6 },
  { term: "express", weight: 8 }, { term: "nestjs", weight: 8 }, { term: "backend", weight: 8 },
  { term: "microservices", weight: 7 },
];

const NICE_TECH_TERMS: WeightedTerm[] = [
  { term: "redis", weight: 6 }, { term: "bullmq", weight: 6 }, { term: "queue", weight: 5 },
  { term: "event driven", weight: 5 }, { term: "docker", weight: 6 }, { term: "aws", weight: 6 },
  { term: "gcp", weight: 6 }, { term: "cloud run", weight: 5 }, { term: "lambda", weight: 5 },
  { term: "pub/sub", weight: 5 }, { term: "ci/cd", weight: 4 }, { term: "jest", weight: 4 },
  { term: "testing", weight: 4 }, { term: "supabase", weight: 4 }, { term: "graphql", weight: 5 },
];

const LOCATION_POSITIVE_TERMS = ["remote", "emea", "europe", "worldwide", "global", "relocation"];
const LOCATION_NEGATIVE_TERMS = ["us only", "u.s. only", "onsite only", "on-site only", "hybrid only"];

@Injectable()
export class FilterService {
  private readonly logger = new Logger(FilterService.name);
  private readonly client: OpenCodeClient;

  constructor(
    private readonly config: ConfigService<EnvConfig>,
    private readonly jobs: JobsRepository,
    private readonly jobFilters: JobFiltersRepository,
  ) {
    this.client = OpenCodeClient.fromConfig(this.config);
  }

  async filterJob(job: JobRecordLite, targetCompanies?: string[]): Promise<FilteredJob | null> {
    const filterMd = readText(`${SKILLS_DIR}/job_filter.md`);
    const prompt = buildFilterPrompt(job as any, filterMd, targetCompanies);
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const filter = await this.client.filterJob(prompt.system, prompt.user);
        if (filter && typeof filter.verdict === "string" && typeof filter.score === "number") {
          return { job, filter: this.normalizeFilter(filter) };
        }
        if (attempt < 3) {
          prompt.user += "\n\nRespond with valid JSON matching this schema: { verdict, score, reasons, must_have_hits, missing }. STRICT: Return ONLY a JSON object.";
        }
      } catch (err: any) {
        this.logger.warn(`[filter] Error attempt ${attempt} for ${job.company}: ${err?.message ?? err}`);
        if (attempt < 3) await new Promise((r) => setTimeout(r, 1000));
      }
    }
    return null;
  }

  normalFilterJob(job: JobRecordLite, config: SearchConfig): FilteredJob {
    const title = job.title || "";
    const description = job.description || "";
    const location = job.location || "";
    const fullText = `${title}\n${description}\n${location}`;
    const minScore = Number.isFinite(Number(config.min_score)) ? Number(config.min_score) : 65;

    const configRoleTerms = (config.roles || []).map((term) => ({ term, weight: 34 }));
    const titleRoleHits = this.collectWeightedHits([...configRoleTerms, ...TITLE_STRONG_TERMS, ...TITLE_GOOD_TERMS], title);
    const descriptionRoleHits = this.collectWeightedHits([...configRoleTerms, ...TITLE_STRONG_TERMS, ...TITLE_GOOD_TERMS], description, 18);
    const requiredTechHits = this.collectWeightedHits(REQUIRED_TECH_TERMS, fullText, 35);
    const niceTechHits = this.collectWeightedHits(NICE_TECH_TERMS, fullText, 20);
    const locationPositiveHits = this.findTermHits(this.uniqueTerms([...LOCATION_POSITIVE_TERMS, ...(config.location || [])]), `${location}\n${description}`);
    const locationNegativeHits = this.findTermHits(LOCATION_NEGATIVE_TERMS, `${location}\n${description}`);

    const configuredRejectTitleHits = this.findTermHits(config.exclude || [], title);
    const hardTitleHits = this.findTermHits(this.uniqueTerms([...HARD_REJECT_TITLE_TERMS, ...configuredRejectTitleHits]), title);
    const hardTextHits = this.findTermHits(HARD_REJECT_TEXT_TERMS, fullText);

    const titlePenaltyHits = this.collectWeightedHits(TITLE_PENALTY_TERMS, title);
    const frontendOnlyPenalty = this.isFrontendOnlyTitle(title) ? 18 : 0;
    const experienceScore = this.scoreExperience(fullText);
    const locationScore = Math.min(15, locationPositiveHits.length * 8) - Math.min(30, locationNegativeHits.length * 15);

    const positiveScore =
      Math.min(45, titleRoleHits.score) +
      (titleRoleHits.hits.length > 0 ? 0 : descriptionRoleHits.score) +
      requiredTechHits.score +
      niceTechHits.score +
      Math.max(0, locationScore) +
      experienceScore.positive;
    const penaltyScore =
      Math.abs(titlePenaltyHits.score) + frontendOnlyPenalty + Math.abs(Math.min(0, locationScore)) + experienceScore.penalty;
    const rawScore = this.clampScore(positiveScore - penaltyScore);
    const hardRejectHits = this.uniqueTerms([...hardTitleHits, ...hardTextHits]);
    const verdict: "accept" | "reject" = hardRejectHits.length === 0 && rawScore >= minScore ? "accept" : "reject";
    const score = hardRejectHits.length > 0 ? 0 : rawScore;

    const reasons: string[] = [];
    const missing: string[] = [];

    if (hardRejectHits.length > 0) reasons.push(`Hard blocker: ${hardRejectHits.slice(0, 5).join(", ")}`);
    if (titleRoleHits.hits.length > 0) reasons.push(`Title match: ${titleRoleHits.hits.slice(0, 5).join(", ")}`);
    else if (descriptionRoleHits.hits.length > 0) reasons.push(`Description role match: ${descriptionRoleHits.hits.slice(0, 5).join(", ")}`);
    if (requiredTechHits.hits.length > 0) reasons.push(`Core tech hits: ${requiredTechHits.hits.slice(0, 7).join(", ")}`);
    if (niceTechHits.hits.length > 0) reasons.push(`Nice-to-have hits: ${niceTechHits.hits.slice(0, 6).join(", ")}`);
    if (locationPositiveHits.length > 0) reasons.push(`Location/work mode match: ${locationPositiveHits.slice(0, 4).join(", ")}`);
    if (titlePenaltyHits.hits.length > 0) reasons.push(`Title penalty: ${titlePenaltyHits.hits.slice(0, 5).join(", ")}`);
    if (locationNegativeHits.length > 0) reasons.push(`Location/work mode penalty: ${locationNegativeHits.join(", ")}`);
    if (experienceScore.reasons.length > 0) reasons.push(...experienceScore.reasons);

    if (titleRoleHits.hits.length === 0) missing.push("No strong target title match");
    if (requiredTechHits.hits.length === 0) missing.push("No core backend tech matched");
    if (score < minScore && hardRejectHits.length === 0) missing.push(`Score ${score} below min_score ${minScore}`);
    if (frontendOnlyPenalty > 0) missing.push("Frontend-only title without backend/full-stack signal");

    return {
      job,
      filter: {
        verdict,
        score,
        reasons,
        must_have_hits: this.uniqueTerms([...titleRoleHits.hits, ...descriptionRoleHits.hits, ...requiredTechHits.hits, ...locationPositiveHits]),
        missing,
      },
    };
  }

  async saveNormalFilterResult(jobId: string, contentHash: string, result: FilteredJob, sequence = 0): Promise<void> {
    await this.jobFilters.save({
      id: `normal-filter-${jobId}-${Date.now()}-${sequence}`,
      jobId,
      contentHash,
      verdict: result.filter.verdict,
      score: result.filter.score,
      reasons: result.filter.reasons,
      mustHaveHits: result.filter.must_have_hits,
      missingItems: result.filter.missing,
      model: "deterministic",
      promptVersion: NORMAL_FILTER_PROMPT_VERSION,
    });
  }

  async saveSmartFilterResult(jobId: string, contentHash: string, result: FilteredJob): Promise<void> {
    await this.jobFilters.save({
      id: `smart-filter-${jobId}-${Date.now()}`,
      jobId,
      contentHash,
      verdict: result.filter.verdict,
      score: result.filter.score,
      reasons: result.filter.reasons,
      mustHaveHits: result.filter.must_have_hits,
      missingItems: result.filter.missing,
      model:
        this.config.get("OPENCODE_MODEL", { infer: true }) || this.config.get("LLM_MODEL", { infer: true }) || "llm",
      promptVersion: SMART_FILTER_PROMPT_VERSION,
    });
  }

  async getNormalFilterCandidates(options: {
    limit?: number;
    force?: boolean;
    companySlug?: string;
    includeClosed?: boolean;
  }): Promise<{ candidates: { jobId: string; companyName: string; title: string; contentHash: string }[]; skipped: number; skippedClosed: number; skippedExisting: number }> {
    const allJobs = options.companySlug
      ? await this.jobs.getByCompany(options.companySlug, null)
      : await this.jobs.getAll(null);

    const candidates: { jobId: string; companyName: string; title: string; contentHash: string }[] = [];
    let skippedClosed = 0;
    let skippedExisting = 0;
    const limit = Math.max(0, options.limit ?? 0);

    for (const row of allJobs) {
      if (limit > 0 && candidates.length >= limit) break;
      if (!options.includeClosed && row.status === "closed") {
        skippedClosed++;
        continue;
      }
      if (!options.force) {
        const existing = await this.jobFilters.getByJobId(row.id);
        if (existing.some((f) => f.promptVersion === NORMAL_FILTER_PROMPT_VERSION && f.contentHash === row.contentHash)) {
          skippedExisting++;
          continue;
        }
      }
      candidates.push({ jobId: row.id, companyName: row.companyName, title: row.title, contentHash: row.contentHash });
    }

    return { candidates, skipped: skippedClosed + skippedExisting, skippedClosed, skippedExisting };
  }

  toLiteJob(row: any): JobRecordLite {
    return {
      id: row.id,
      site: row.ats || "",
      title: row.title,
      company: row.companyName,
      location: row.location,
      url: row.url,
      description: row.description,
    };
  }

  private normalizeFilter(filter: any): FilterResult {
    return {
      verdict: filter.verdict === "accept" ? "accept" : "reject",
      score: Number(filter.score) || 0,
      reasons: Array.isArray(filter.reasons) ? filter.reasons.map(String) : [],
      must_have_hits: Array.isArray(filter.must_have_hits) ? filter.must_have_hits.map(String) : [],
      missing: Array.isArray(filter.missing) ? filter.missing.map(String) : [],
    };
  }

  private findTermHits(terms: string[], text: string): string[] {
    const hits: string[] = [];
    const seen = new Set<string>();
    for (const term of terms) {
      const key = this.termKey(term);
      if (!key || seen.has(key)) continue;
      if (!this.termMatches(term, text)) continue;
      seen.add(key);
      hits.push(term);
    }
    return hits;
  }

  private collectWeightedHits(terms: WeightedTerm[], text: string, cap = Number.POSITIVE_INFINITY): { hits: string[]; score: number } {
    const hits: string[] = [];
    let score = 0;
    const seen = new Set<string>();
    for (const item of terms) {
      const normalized = this.termKey(item.term);
      if (!normalized || seen.has(normalized)) continue;
      if (!this.termMatches(item.term, text)) continue;
      seen.add(normalized);
      hits.push(item.term);
      score += item.weight;
    }
    if (score > cap) score = cap;
    if (score < -cap) score = -cap;
    return { hits, score };
  }

  private uniqueTerms(terms: string[]): string[] {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const term of terms) {
      const normalized = this.termKey(term);
      if (!normalized || seen.has(normalized)) continue;
      seen.add(normalized);
      result.push(term.trim());
    }
    return result;
  }

  private termKey(term: string): string {
    return term.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
  }

  private termMatches(term: string, text: string): boolean {
    const normalizedTerm = term.trim();
    if (!normalizedTerm) return false;
    const compactTerm = normalizedTerm.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const compactText = text.toLowerCase().replace(/[^a-z0-9]+/g, "");
    const hasSeparator = /[^a-z0-9]/i.test(normalizedTerm);
    if (hasSeparator && compactTerm.length >= 4 && compactText.includes(compactTerm)) return true;
    const escaped = normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/[\s-]+/g, "[\\s-]+");
    return new RegExp(`\\b${escaped}\\b`, "i").test(text);
  }

  private isFrontendOnlyTitle(title: string): boolean {
    const hasFrontend = ["frontend", "front end", "front-end"].some((term) => this.termMatches(term, title));
    if (!hasFrontend) return false;
    const hasBackendSignal = [
      "backend", "back end", "back-end", "fullstack", "full stack", "full-stack", "software engineer",
    ].some((term) => this.termMatches(term, title));
    return !hasBackendSignal;
  }

  private scoreExperience(text: string): { positive: number; penalty: number; reasons: string[] } {
    const normalized = text.replace(/\s+/g, " ");
    const reasons: string[] = [];
    const heavy = normalized.match(/\b(8|9|10|11|12|15)\+?\s*(years|yrs)\b/i);
    const moderate = normalized.match(/\b([3-5])\+?\s*(years|yrs)\b/i);
    if (heavy) {
      reasons.push(`Experience penalty: ${heavy[0]}`);
      return { positive: 0, penalty: 18, reasons };
    }
    if (moderate) {
      reasons.push(`Experience match: ${moderate[0]}`);
      return { positive: 8, penalty: 0, reasons };
    }
    return { positive: 0, penalty: 0, reasons };
  }

  private clampScore(score: number): number {
    return Math.max(0, Math.min(100, Math.round(score)));
  }
}

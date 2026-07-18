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
var FilterService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilterService = exports.SMART_FILTER_PROMPT_VERSION = exports.NORMAL_FILTER_PROMPT_VERSION = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const repositories_1 = require("../database/repositories");
const llm_1 = require("../shared/llm");
const prompts_1 = require("../shared/prompts");
const utils_1 = require("../shared/utils");
const paths_1 = require("../common/paths");
exports.NORMAL_FILTER_PROMPT_VERSION = "normal-filter-scoring-v1";
exports.SMART_FILTER_PROMPT_VERSION = "smart-filter-v1";
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
const TITLE_STRONG_TERMS = [
    { term: "backend engineer", weight: 42 }, { term: "back end engineer", weight: 42 }, { term: "back-end engineer", weight: 42 },
    { term: "backend developer", weight: 38 }, { term: "back end developer", weight: 38 }, { term: "back-end developer", weight: 38 },
    { term: "node.js engineer", weight: 38 }, { term: "node engineer", weight: 36 }, { term: "typescript engineer", weight: 34 },
    { term: "api engineer", weight: 32 },
];
const TITLE_GOOD_TERMS = [
    { term: "software engineer", weight: 30 }, { term: "software developer", weight: 28 },
    { term: "fullstack engineer", weight: 30 }, { term: "full stack engineer", weight: 30 }, { term: "full-stack engineer", weight: 30 },
    { term: "fullstack developer", weight: 28 }, { term: "full stack developer", weight: 28 }, { term: "full-stack developer", weight: 28 },
    { term: "platform engineer", weight: 24 }, { term: "web engineer", weight: 18 }, { term: "web developer", weight: 16 },
];
const TITLE_PENALTY_TERMS = [
    { term: "senior", weight: -12 }, { term: "sr", weight: -12 }, { term: "lead", weight: -18 },
    { term: "manager", weight: -28 }, { term: "architect", weight: -24 }, { term: "frontend", weight: -16 },
    { term: "front end", weight: -16 }, { term: "front-end", weight: -16 }, { term: "react native", weight: -24 },
    { term: "mobile", weight: -30 }, { term: "ios", weight: -30 }, { term: "android", weight: -30 },
];
const REQUIRED_TECH_TERMS = [
    { term: "node.js", weight: 12 }, { term: "nodejs", weight: 12 }, { term: "node", weight: 10 },
    { term: "typescript", weight: 12 }, { term: "javascript", weight: 8 }, { term: "postgresql", weight: 12 },
    { term: "postgres", weight: 12 }, { term: "rest api", weight: 10 }, { term: "api", weight: 6 },
    { term: "express", weight: 8 }, { term: "nestjs", weight: 8 }, { term: "backend", weight: 8 },
    { term: "microservices", weight: 7 },
];
const NICE_TECH_TERMS = [
    { term: "redis", weight: 6 }, { term: "bullmq", weight: 6 }, { term: "queue", weight: 5 },
    { term: "event driven", weight: 5 }, { term: "docker", weight: 6 }, { term: "aws", weight: 6 },
    { term: "gcp", weight: 6 }, { term: "cloud run", weight: 5 }, { term: "lambda", weight: 5 },
    { term: "pub/sub", weight: 5 }, { term: "ci/cd", weight: 4 }, { term: "jest", weight: 4 },
    { term: "testing", weight: 4 }, { term: "supabase", weight: 4 }, { term: "graphql", weight: 5 },
];
const LOCATION_POSITIVE_TERMS = ["remote", "emea", "europe", "worldwide", "global", "relocation"];
const LOCATION_NEGATIVE_TERMS = ["us only", "u.s. only", "onsite only", "on-site only", "hybrid only"];
let FilterService = FilterService_1 = class FilterService {
    config;
    jobs;
    jobFilters;
    logger = new common_1.Logger(FilterService_1.name);
    client;
    constructor(config, jobs, jobFilters) {
        this.config = config;
        this.jobs = jobs;
        this.jobFilters = jobFilters;
        this.client = llm_1.OpenCodeClient.fromConfig(this.config);
    }
    async filterJob(job, targetCompanies) {
        const filterMd = (0, utils_1.readText)(`${paths_1.SKILLS_DIR}/job_filter.md`);
        const prompt = (0, prompts_1.buildFilterPrompt)(job, filterMd, targetCompanies);
        for (let attempt = 1; attempt <= 3; attempt++) {
            try {
                const filter = await this.client.filterJob(prompt.system, prompt.user);
                if (filter && typeof filter.verdict === "string" && typeof filter.score === "number") {
                    return { job, filter: this.normalizeFilter(filter) };
                }
                if (attempt < 3) {
                    prompt.user += "\n\nRespond with valid JSON matching this schema: { verdict, score, reasons, must_have_hits, missing }. STRICT: Return ONLY a JSON object.";
                }
            }
            catch (err) {
                this.logger.warn(`[filter] Error attempt ${attempt} for ${job.company}: ${err?.message ?? err}`);
                if (attempt < 3)
                    await new Promise((r) => setTimeout(r, 1000));
            }
        }
        return null;
    }
    normalFilterJob(job, config) {
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
        const positiveScore = Math.min(45, titleRoleHits.score) +
            (titleRoleHits.hits.length > 0 ? 0 : descriptionRoleHits.score) +
            requiredTechHits.score +
            niceTechHits.score +
            Math.max(0, locationScore) +
            experienceScore.positive;
        const penaltyScore = Math.abs(titlePenaltyHits.score) + frontendOnlyPenalty + Math.abs(Math.min(0, locationScore)) + experienceScore.penalty;
        const rawScore = this.clampScore(positiveScore - penaltyScore);
        const hardRejectHits = this.uniqueTerms([...hardTitleHits, ...hardTextHits]);
        const verdict = hardRejectHits.length === 0 && rawScore >= minScore ? "accept" : "reject";
        const score = hardRejectHits.length > 0 ? 0 : rawScore;
        const reasons = [];
        const missing = [];
        if (hardRejectHits.length > 0)
            reasons.push(`Hard blocker: ${hardRejectHits.slice(0, 5).join(", ")}`);
        if (titleRoleHits.hits.length > 0)
            reasons.push(`Title match: ${titleRoleHits.hits.slice(0, 5).join(", ")}`);
        else if (descriptionRoleHits.hits.length > 0)
            reasons.push(`Description role match: ${descriptionRoleHits.hits.slice(0, 5).join(", ")}`);
        if (requiredTechHits.hits.length > 0)
            reasons.push(`Core tech hits: ${requiredTechHits.hits.slice(0, 7).join(", ")}`);
        if (niceTechHits.hits.length > 0)
            reasons.push(`Nice-to-have hits: ${niceTechHits.hits.slice(0, 6).join(", ")}`);
        if (locationPositiveHits.length > 0)
            reasons.push(`Location/work mode match: ${locationPositiveHits.slice(0, 4).join(", ")}`);
        if (titlePenaltyHits.hits.length > 0)
            reasons.push(`Title penalty: ${titlePenaltyHits.hits.slice(0, 5).join(", ")}`);
        if (locationNegativeHits.length > 0)
            reasons.push(`Location/work mode penalty: ${locationNegativeHits.join(", ")}`);
        if (experienceScore.reasons.length > 0)
            reasons.push(...experienceScore.reasons);
        if (titleRoleHits.hits.length === 0)
            missing.push("No strong target title match");
        if (requiredTechHits.hits.length === 0)
            missing.push("No core backend tech matched");
        if (score < minScore && hardRejectHits.length === 0)
            missing.push(`Score ${score} below min_score ${minScore}`);
        if (frontendOnlyPenalty > 0)
            missing.push("Frontend-only title without backend/full-stack signal");
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
    async saveNormalFilterResult(jobId, contentHash, result, sequence = 0) {
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
            promptVersion: exports.NORMAL_FILTER_PROMPT_VERSION,
        });
    }
    async saveSmartFilterResult(jobId, contentHash, result) {
        await this.jobFilters.save({
            id: `smart-filter-${jobId}-${Date.now()}`,
            jobId,
            contentHash,
            verdict: result.filter.verdict,
            score: result.filter.score,
            reasons: result.filter.reasons,
            mustHaveHits: result.filter.must_have_hits,
            missingItems: result.filter.missing,
            model: this.config.get("OPENCODE_MODEL", { infer: true }) || this.config.get("LLM_MODEL", { infer: true }) || "llm",
            promptVersion: exports.SMART_FILTER_PROMPT_VERSION,
        });
    }
    async getNormalFilterCandidates(options) {
        const allJobs = options.companySlug
            ? await this.jobs.getByCompany(options.companySlug, null)
            : await this.jobs.getAll(null);
        const candidates = [];
        let skippedClosed = 0;
        let skippedExisting = 0;
        const limit = Math.max(0, options.limit ?? 0);
        for (const row of allJobs) {
            if (limit > 0 && candidates.length >= limit)
                break;
            if (!options.includeClosed && row.status === "closed") {
                skippedClosed++;
                continue;
            }
            if (!options.force) {
                const existing = await this.jobFilters.getByJobId(row.id);
                if (existing.some((f) => f.promptVersion === exports.NORMAL_FILTER_PROMPT_VERSION && f.contentHash === row.contentHash)) {
                    skippedExisting++;
                    continue;
                }
            }
            candidates.push({ jobId: row.id, companyName: row.companyName, title: row.title, contentHash: row.contentHash });
        }
        return { candidates, skipped: skippedClosed + skippedExisting, skippedClosed, skippedExisting };
    }
    toLiteJob(row) {
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
    normalizeFilter(filter) {
        return {
            verdict: filter.verdict === "accept" ? "accept" : "reject",
            score: Number(filter.score) || 0,
            reasons: Array.isArray(filter.reasons) ? filter.reasons.map(String) : [],
            must_have_hits: Array.isArray(filter.must_have_hits) ? filter.must_have_hits.map(String) : [],
            missing: Array.isArray(filter.missing) ? filter.missing.map(String) : [],
        };
    }
    findTermHits(terms, text) {
        const hits = [];
        const seen = new Set();
        for (const term of terms) {
            const key = this.termKey(term);
            if (!key || seen.has(key))
                continue;
            if (!this.termMatches(term, text))
                continue;
            seen.add(key);
            hits.push(term);
        }
        return hits;
    }
    collectWeightedHits(terms, text, cap = Number.POSITIVE_INFINITY) {
        const hits = [];
        let score = 0;
        const seen = new Set();
        for (const item of terms) {
            const normalized = this.termKey(item.term);
            if (!normalized || seen.has(normalized))
                continue;
            if (!this.termMatches(item.term, text))
                continue;
            seen.add(normalized);
            hits.push(item.term);
            score += item.weight;
        }
        if (score > cap)
            score = cap;
        if (score < -cap)
            score = -cap;
        return { hits, score };
    }
    uniqueTerms(terms) {
        const seen = new Set();
        const result = [];
        for (const term of terms) {
            const normalized = this.termKey(term);
            if (!normalized || seen.has(normalized))
                continue;
            seen.add(normalized);
            result.push(term.trim());
        }
        return result;
    }
    termKey(term) {
        return term.trim().toLowerCase().replace(/[^a-z0-9]+/g, "");
    }
    termMatches(term, text) {
        const normalizedTerm = term.trim();
        if (!normalizedTerm)
            return false;
        const compactTerm = normalizedTerm.toLowerCase().replace(/[^a-z0-9]+/g, "");
        const compactText = text.toLowerCase().replace(/[^a-z0-9]+/g, "");
        const hasSeparator = /[^a-z0-9]/i.test(normalizedTerm);
        if (hasSeparator && compactTerm.length >= 4 && compactText.includes(compactTerm))
            return true;
        const escaped = normalizedTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/[\s-]+/g, "[\\s-]+");
        return new RegExp(`\\b${escaped}\\b`, "i").test(text);
    }
    isFrontendOnlyTitle(title) {
        const hasFrontend = ["frontend", "front end", "front-end"].some((term) => this.termMatches(term, title));
        if (!hasFrontend)
            return false;
        const hasBackendSignal = [
            "backend", "back end", "back-end", "fullstack", "full stack", "full-stack", "software engineer",
        ].some((term) => this.termMatches(term, title));
        return !hasBackendSignal;
    }
    scoreExperience(text) {
        const normalized = text.replace(/\s+/g, " ");
        const reasons = [];
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
    clampScore(score) {
        return Math.max(0, Math.min(100, Math.round(score)));
    }
};
exports.FilterService = FilterService;
exports.FilterService = FilterService = FilterService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        repositories_1.JobsRepository,
        repositories_1.JobFiltersRepository])
], FilterService);
//# sourceMappingURL=filter.service.js.map
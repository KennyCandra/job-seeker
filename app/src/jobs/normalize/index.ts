import type { AtsPlatform, JobRecord } from "../../shared/types";
import type { NormalizedJobInput } from "../sync/types";

type RawJob = Record<string, unknown>;
type NormalizableAts = Exclude<AtsPlatform, "custom">;
type FieldGetter = (raw: RawJob) => string;

type BaseNormalizerConfig = {
  site: NormalizableAts;
  idPrefix: string;
};

type AtsNormalizerConfig = BaseNormalizerConfig & {
  getExternalId: FieldGetter;
  getTitle: FieldGetter;
  getUrl: FieldGetter;
  getLocation: FieldGetter;
  getDescription: FieldGetter;
  getCompany: FieldGetter;
  getPostedAt: FieldGetter;
};

export type NormalizationResult = {
  inputs: NormalizedJobInput[];
  rawDataByJobId: Map<string, unknown>;
};

export function normalizeJob(raw: RawJob, ats: AtsPlatform): JobRecord {
  if (ats === "custom") throw new Error("Custom jobs cannot be normalized by ATS normalizer");
  return normalizeWithConfig(raw, normalizers[ats]);
}

export function normalizeJobToInput(
  raw: RawJob,
  ats: AtsPlatform,
  companyId: number,
): NormalizedJobInput {
  const job = normalizeJob(raw, ats);
  return {
    id: job.id,
    companyId,
    externalId: extractExternalId(job),
    url: job.url,
    title: job.title,
    location: job.location,
    description: job.description,
    rawJson: raw,
  };
}

export function handleNormalization(
  rawJobs: RawJob[],
  ats: AtsPlatform,
  companyId: number,
): NormalizationResult {
  const rawDataByJobId = new Map<string, unknown>();

  const inputs = rawJobs.map((raw) => {
    const input = normalizeJobToInput(raw, ats, companyId);
    rawDataByJobId.set(input.id, raw);
    return input;
  });

  return { inputs, rawDataByJobId };
}

function extractExternalId(job: JobRecord): string {
  if (job.id.startsWith("gh-")) return job.id.slice(3);
  if (job.id.startsWith("lever-")) return job.id.slice(6);
  if (job.id.startsWith("ashby-")) return job.id.slice(6);
  return job.id;
}

function normalizeWithConfig(raw: RawJob, config: AtsNormalizerConfig): JobRecord {
  const externalId = config.getExternalId(raw);
  return {
    id: `${config.idPrefix}-${externalId || Date.now()}`,
    site: config.site,
    title: config.getTitle(raw),
    company: config.getCompany(raw),
    location: config.getLocation(raw),
    url: config.getUrl(raw),
    description: cleanDescription(config.getDescription(raw)),
    posted_at: config.getPostedAt(raw),
  };
}

const normalizers = {
  greenhouse: defineNormalizer({
    site: "greenhouse",
    idPrefix: "gh",
    getExternalId: (raw) => stringValue(raw.id),
    getTitle: (raw) => stringValue(raw.title),
    getUrl: (raw) => stringValue(raw.absolute_url),
    getLocation: (raw) => stringValue((raw.location as { name?: unknown } | undefined)?.name),
    getDescription: (raw) => stringValue(raw.content),
    getCompany: (raw) => extractCompanyFromBoardUrl(stringValue(raw.absolute_url)),
    getPostedAt: (raw) => stringValue(raw.updated_at),
  }),
  lever: defineNormalizer({
    site: "lever",
    idPrefix: "lever",
    getExternalId: (raw) => stringValue(raw.id),
    getTitle: (raw) => stringValue(raw.title),
    getUrl: (raw) => stringValue(raw.hostedUrl),
    getLocation: (raw) => stringValue((raw.categories as Record<string, unknown> | undefined)?.location || raw.location),
    getDescription: (raw) => stringValue(raw.text || raw.description),
    getCompany: (raw) => stringValue((raw.categories as Record<string, unknown> | undefined)?.team) || extractCompanyFromLeverUrl(stringValue(raw.hostedUrl)),
    getPostedAt: (raw) => stringValue(raw.createdAt),
  }),
  ashby: defineNormalizer({
    site: "ashby",
    idPrefix: "ashby",
    getExternalId: (raw) => stringValue(raw.id || raw.jobId),
    getTitle: (raw) => stringValue(raw.title),
    getUrl: (raw) => stringValue(raw.jobUrl || raw.applyUrl),
    getLocation: (raw) => stringValue(raw.location),
    getDescription: (raw) => stringValue(raw.descriptionPlain || raw.descriptionHtml),
    getCompany: (raw) => stringValue(raw.company) || extractCompanyFromAshbyUrl(stringValue(raw.jobUrl)),
    getPostedAt: (raw) => stringValue(raw.publishedAt),
  }),
} satisfies Record<NormalizableAts, AtsNormalizerConfig>;

function defineNormalizer(config: AtsNormalizerConfig): AtsNormalizerConfig {
  return config;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function cleanDescription(value: string): string {
  return value.replace(/<[^>]*>/g, "").trim().slice(0, 3000);
}

function extractCompanyFromBoardUrl(url: string): string {
  const m = url?.match(/greenhouse\.io\/([^/]+)/);
  return m ? m[1] : "";
}

function extractCompanyFromLeverUrl(url: string): string {
  const m = url?.match(/lever\.co\/([^/]+)/);
  return m ? m[1] : "";
}

function extractCompanyFromAshbyUrl(url: string): string {
  const m = url?.match(/ashbyhq\.com\/([^/]+)/);
  return m ? m[1] : "";
}

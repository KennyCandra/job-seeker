import type { AtsPlatform, JobRecord } from "../../shared/types";

type RawJob = Record<string, unknown>;

export function normalizeJob(raw: RawJob, ats: AtsPlatform): JobRecord {
  switch (ats) {
    case "greenhouse": return normalizeGreenhouseJob(raw);
    case "lever": return normalizeLeverJob(raw);
    case "ashby": return normalizeAshbyJob(raw);
    default: throw new Error(`Unknown ATS: ${ats}`);
  }
}

export function normalizeJobToInput(
  raw: RawJob,
  ats: AtsPlatform,
  companyId: number,
  companyName: string,
): { id: string; externalId: string; url: string; title: string; location: string; description: string; rawJson: unknown } {
  const job = normalizeJob(raw, ats);
  return {
    id: job.id,
    externalId: extractExternalId(job),
    url: job.url,
    title: job.title,
    location: job.location,
    description: job.description,
    rawJson: raw,
  };
}

function extractExternalId(job: JobRecord): string {
  if (job.id.startsWith("gh-")) return job.id.slice(3);
  if (job.id.startsWith("lever-")) return job.id.slice(6);
  if (job.id.startsWith("ashby-")) return job.id.slice(6);
  return job.id;
}

function normalizeGreenhouseJob(raw: RawJob): JobRecord {
  const content = (raw.content as string) || "";
  const cleanDesc = content.replace(/<[^>]*>/g, "").trim().slice(0, 3000);
  const loc = (raw.location as { name?: string })?.name || "";

  return {
    id: `gh-${raw.id || Date.now()}`,
    site: "greenhouse",
    title: (raw.title as string) || "",
    company: extractCompanyFromBoardUrl(raw.absolute_url as string) || "",
    location: loc,
    url: (raw.absolute_url as string) || "",
    description: cleanDesc,
    posted_at: (raw.updated_at as string) || "",
  };
}

function normalizeLeverJob(raw: RawJob): JobRecord {
  const text = (raw.text as string) || (raw.description as string) || "";
  const cleanDesc = text.replace(/<[^>]*>/g, "").trim().slice(0, 3000);
  const loc = (raw.categories as Record<string, string>)?.location || raw.location || "";

  return {
    id: `lever-${raw.id || Date.now()}`,
    site: "lever",
    title: (raw.title as string) || "",
    company: (raw.categories as Record<string, string>)?.team || extractCompanyFromLeverUrl(raw.hostedUrl as string) || "",
    location: typeof loc === "string" ? loc : "",
    url: (raw.hostedUrl as string) || "",
    description: cleanDesc,
    posted_at: (raw.createdAt as string) || "",
  };
}

function normalizeAshbyJob(raw: RawJob): JobRecord {
  const cleanDesc = ((raw.descriptionPlain as string) || "").trim().slice(0, 3000);

  return {
    id: `ashby-${raw.id || raw.jobId || Date.now()}`,
    site: "ashby",
    title: (raw.title as string) || "",
    company: (raw.company as string) || extractCompanyFromAshbyUrl(raw.jobUrl as string) || "",
    location: (raw.location as string) || "",
    url: (raw.jobUrl as string) || (raw.applyUrl as string) || "",
    description: cleanDesc,
    posted_at: (raw.publishedAt as string) || "",
  };
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
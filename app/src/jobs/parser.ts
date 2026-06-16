import type { AtsPlatform, JobRecord } from "../shared/types";
import type { SearchConfig } from "../shared/types";
import { slug } from "../shared/index";

export function normalizeJob(raw: Record<string, unknown>, ats: AtsPlatform): JobRecord {
  switch (ats) {
    case "greenhouse": return normalizeGreenhouseJob(raw);
    case "lever": return normalizeLeverJob(raw);
    case "ashby": return normalizeAshbyJob(raw);
    default: throw new Error(`Unknown ATS: ${ats}`);
  }
}

function normalizeGreenhouseJob(raw: Record<string, unknown>): JobRecord {
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

function normalizeLeverJob(raw: Record<string, unknown>): JobRecord {
  const text = (raw.text as string) || (raw.description as string) || "";
  const cleanDesc = text.replace(/<[^>]*>/g, "").trim().slice(0, 3000);
  const categories = raw.categories as Record<string, string> || {};
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

function normalizeAshbyJob(raw: Record<string, unknown>): JobRecord {
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

export function extractStackMentions(description: string, config: SearchConfig): string[] {
  const lower = description.toLowerCase();
  const mentions: string[] = [];
  const stack = (config as SearchConfig & { stack?: string[] }).stack || [];
  for (const tech of stack) {
    if (lower.includes(tech.toLowerCase())) {
      mentions.push(tech);
    }
  }
  return mentions;
}

export function buildJobId(company: string, title: string): string {
  return `${slug(company)}-${slug(title)}`;
}


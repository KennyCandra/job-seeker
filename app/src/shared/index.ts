import { join } from "path";
import { OpenCodeClient } from "./llm";
import { readText } from "./utils";
import { buildDocumentPrompt, buildExtractPrompt } from "./prompts";
import { parseJsonFromText } from "./llm";
import type { JobRecord, ResumePayload, ApplicationPayload, AtsPlatform } from "./types";

export const APP_ROOT = join(import.meta.dir, "..", "..", "..");
export const DATA_DIR = join(APP_ROOT, "data");
export const OUTPUT_DIR = join(APP_ROOT, "output");
export const SKILLS_DIR = join(APP_ROOT, "app", "skills");
export const JOBS_DIR = join(DATA_DIR, "jobs");

export function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function boardUrlForAts(slug: string, ats: AtsPlatform): string {
  switch (ats) {
    case "greenhouse": return `https://boards.greenhouse.io/${slug}`;
    case "lever": return `https://jobs.lever.co/${slug}`;
    case "ashby": return `https://jobs.ashbyhq.com/${slug}`;
  }
}

export function createClient(): OpenCodeClient {
  const baseUrl = process.env.OPENCODE_BASE_URL || undefined;
  const model = process.env.OPENCODE_MODEL || undefined;
  const providerId = process.env.OPENCODE_PROVIDER_ID || undefined;
  const timeoutMs = process.env.OPENCODE_TIMEOUT_MS ? Number(process.env.OPENCODE_TIMEOUT_MS) : undefined;
  const debugDir = process.env.OPENCODE_DEBUG_DIR || join(DATA_DIR, "debug");
  return new OpenCodeClient({ baseUrl, model, providerId, timeoutMs, debugDir });
}

export function getPersonalData() {
  return {
    name: process.env.PERSONAL_NAME || "Ahmed Abdelrahman",
    email: process.env.PERSONAL_EMAIL || "ahmedabdelrhaman232@gmail.com",
    phone: process.env.PERSONAL_PHONE || "+201024180920",
    location: process.env.PERSONAL_LOCATION || "Cairo, Egypt (UTC+3)",
    linkedin: process.env.PERSONAL_LINKEDIN || "https://linkedin.com/in/ahmed-abdelrahman",
    portfolio: process.env.PERSONAL_PORTFOLIO || "https://kennycandra.dev",
  };
}

export function normalizeResumePayload(raw: any): ResumePayload {
  const candidate = raw.candidate || raw.contact || raw.personal_info || {};
  const educationArray = Array.isArray(raw.education) ? raw.education : raw.education ? [raw.education] : [];
  const experienceArray = Array.isArray(raw.experience) ? raw.experience : raw.experience ? [raw.experience] : Array.isArray(raw.work) ? raw.work : raw.work ? [raw.work] : [];
  const projectsArray = Array.isArray(raw.projects) ? raw.projects : raw.projects ? [raw.projects] : [];

  const skillsArray = (() => {
    if (!Array.isArray(raw.skills)) {
      if (raw.skills && typeof raw.skills === "object") {
        return Object.entries(raw.skills).map(([category, items]) => ({
          category,
          items: Array.isArray(items) ? items : [String(items)],
        }));
      }
      return [];
    }
    const first = raw.skills[0] || {};
    if ("keywords" in first) {
      return raw.skills.map((s: any) => ({ category: s.name || s.category || "", items: s.keywords }));
    }
    return raw.skills;
  })();

  const basics = raw.basics || raw.personal || raw.personalInfo || raw.contact || raw.personal_info || {};
  const basicsUrls = basics.urls || {};

  return {
    name: raw.name || basics.name || candidate.name || "",
    email: raw.email || basics.email || candidate.email || "",
    phone: raw.phone || basics.phone || candidate.phone || "",
    location: raw.location || basics.location || candidate.location || "",
    linkedin: raw.linkedin || basics.linkedin || basicsUrls.linkedin || candidate.linkedin || "",
    portfolio: raw.portfolio || basics.portfolio || basicsUrls.portfolio || candidate.portfolio,
    experience: experienceArray.map((item: any) => ({
      title: item.title || item.position || item.role || "",
      company: item.company || item.name || "",
      dates: item.dates || [item.start_date || item.startDate, item.end_date || item.endDate].filter(Boolean).join(" - ") || "",
      bullets: Array.isArray(item.bullets) ? item.bullets : Array.isArray(item.highlights) ? item.highlights : item.bullets ? [String(item.bullets)] : [],
    })),
    skills: skillsArray,
    education: educationArray.map((item: any) => ({
      degree: item.degree || item.area || "",
      school: item.school || item.institution || "",
      year: String(item.year || item.endDate || ""),
    })),
    projects: projectsArray.map((item: any) => ({
      name: item.name || "",
      link: item.link || item.url,
      description: item.description,
      techStack: Array.isArray(item.tech) ? item.tech.join(", ") : Array.isArray(item.skills) ? item.skills.join(", ") : item.tech,
      highlights: Array.isArray(item.highlights) ? item.highlights : item.bullets,
      skillsUsed: (() => {
        if (Array.isArray(item.skillsUsed)) return item.skillsUsed.join(", ");
        if (Array.isArray(item.skills_used)) return item.skills_used.join(", ");
        return item.skillsUsed || item.skills_used;
      })(),
    })),
  };
}

export function renderApplicationMarkdown(job: JobRecord, resume: ResumePayload, application: ApplicationPayload): string {
  return [
    "# Application Package",
    "",
    "## Job",
    `- Title: ${job.title}`,
    `- Company: ${job.company}`,
    `- Location: ${job.location}`,
    `- URL: ${job.url}`,
    "",
    "## Cover Letter",
    application.cover_letter,
    "",
    "## Email",
    `Subject: ${application.email_subject}`,
    "",
    application.email_body,
  ].join("\n");
}

export function jobDir(job: JobRecord): string {
  return join(JOBS_DIR, slug(job.company));
}

export async function generateDocument(
  docType: "recommendation" | "custom",
  job: JobRecord,
  resume: ResumePayload,
  customInstruction?: string,
): Promise<string> {
  const docsMd = readText(join(SKILLS_DIR, "documents.md"));
  const client = createClient();
  const prompt = buildDocumentPrompt(docType, job, resume, docsMd, customInstruction);
  const result = await client.completeJson(prompt.system, prompt.user);
  const parsed = parseJsonFromText<Record<string, string>>(result);
  return parsed.content || result;
}

export async function extractJobFromText(text: string): Promise<JobRecord> {
  const client = createClient();
  const prompt = buildExtractPrompt(text);
  const result = await client.completeJson(prompt.system, prompt.user);
  const data = parseJsonFromText<Record<string, string>>(result);
  return {
    id: `manual-${Date.now()}`,
    site: "manual",
    title: data.title || "Unknown Position",
    company: data.company || "Unknown Company",
    location: data.location || "Unknown",
    url: data.url || "",
    description: (data.description || text).slice(0, 2000),
    posted_at: new Date().toISOString(),
  };
}

import { join } from "path";
import { createClient } from "./client";
import { readText } from "./utils";
import { parseJsonFromText } from "./llm";
import { buildDocumentPrompt, buildExtractPrompt } from "./prompts";
import { SKILLS_DIR } from "./paths";
import type { JobRecord, ResumePayload, ApplicationPayload } from "./types";

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

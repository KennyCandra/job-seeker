import { join } from "path";
import { mkdirSync } from "fs";
import { OpenCodeClient } from "../shared/llm";
import type { JobRecord, ResumePayload, ApplicationPayload } from "../shared/types";
import { readText, writeJson, writeText } from "../shared/utils";
import { generateResume } from "./latex";
import { resumeSchema, applicationSchema } from "../schemas/index";
import { buildResumePrompt, buildApplicationPrompt } from "../shared/prompts";
import { applications } from "../db";
import { APP_ROOT, SKILLS_DIR, slug, normalizeResumePayload, getPersonalData, renderApplicationMarkdown } from "../shared/index";

const JOBS_DIR = join(APP_ROOT, "data", "jobs");
const CV_MD = join(SKILLS_DIR, "cv_profile.md");
const APP_MD = join(SKILLS_DIR, "application_prefs.md");

export async function generateResumeForJob(client: OpenCodeClient, job: JobRecord): Promise<ResumePayload> {
  const cvMd = readText(CV_MD);
  const personal = getPersonalData();
  console.log(`[generator] Resume for ${job.company} - ${job.title}...`);
  const prompt = buildResumePrompt(job, cvMd, personal);
  const resume = await client.createResume(prompt.system, prompt.user);
  const normalized = normalizeResumePayload(resume);

  normalized.name = personal.name;
  normalized.email = personal.email;
  normalized.phone = personal.phone;
  normalized.location = personal.location;
  normalized.linkedin = personal.linkedin;
  normalized.portfolio = personal.portfolio || normalized.portfolio;

  const parsed = resumeSchema.safeParse(normalized);
  if (!parsed.success) {
    const debugPath = join(APP_ROOT, "data", "debug", `resume-${slug(job.company)}-${slug(job.title)}.json`);
    writeJson(debugPath, { job, raw: resume, normalized, issues: parsed.error.issues });
    throw new Error(`Resume schema mismatch for ${job.company}. See ${debugPath}`);
  }
  return parsed.data;
}

export async function generateApplicationForJob(
  client: OpenCodeClient,
  job: JobRecord,
  resume: ResumePayload,
): Promise<ApplicationPayload> {
  const appMd = readText(APP_MD);
  console.log("[generator] Application copy...");
  const prompt = buildApplicationPrompt(job, resume, appMd);
  const application = await client.createApplication(prompt.system, prompt.user);
  return applicationSchema.parse(application);
}

export async function compilePdf(job: JobRecord, resume: ResumePayload): Promise<string> {
  const jobDir = join(JOBS_DIR, slug(job.company));
  mkdirSync(jobDir, { recursive: true });

  const resumePath = join(jobDir, "resume.json");
  writeJson(resumePath, resume);

  const pdfPath = join(jobDir, `${slug(resume.name)}.pdf`);
  await generateResume(resumePath, pdfPath);
  return pdfPath;
}

export async function makeCvForJob(job: JobRecord, score: number, client?: OpenCodeClient): Promise<ResumePayload> {
  const c = client || new OpenCodeClient({
    baseUrl: process.env.OPENCODE_BASE_URL || undefined,
    model: process.env.OPENCODE_MODEL || undefined,
    providerId: process.env.OPENCODE_PROVIDER_ID || undefined,
  });

  const dir = join(JOBS_DIR, slug(job.company));
  mkdirSync(dir, { recursive: true });

  const resume = await generateResumeForJob(c, job);
  writeJson(join(dir, "resume.json"), resume);

  const pdfPath = await compilePdf(job, resume);
  console.log(`[generator] PDF saved: ${pdfPath}`);

  applications.instance.saveAcceptedJob({ jobId: job.id, company: job.company, title: job.title, location: job.location, site: job.site, url: job.url, score });

  const app = await generateApplicationForJob(c, job, resume);
  writeJson(join(dir, "application.json"), app);

  const md = renderApplicationMarkdown(job, resume, app);
  writeText(join(dir, "application.md"), md);

  return resume;
}

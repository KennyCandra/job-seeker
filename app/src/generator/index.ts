import { join } from "path";
import { mkdirSync } from "fs";
import { OpenCodeClient } from "../shared/llm";
import type { JobRecord, ResumePayload, ApplicationPayload } from "../shared/types";
import { writeJson, writeText } from "../shared/utils";
import { generateResume } from "./latex";
import { resumeSchema, applicationSchema } from "../schemas/index";
import { buildResumePrompt, buildApplicationPrompt, buildDocumentPrompt } from "../shared/prompts";
import { companies, jobs, jobDocuments } from "../db";
import { APP_ROOT, slug, normalizeResumePayload, getPersonalData, getProfileForLlm, getApplicationPrefsForLlm, renderApplicationMarkdown, parseJsonFromText } from "../shared/index";

const JOBS_DIR = join(APP_ROOT, "data", "jobs");
function getClient(client?: OpenCodeClient): OpenCodeClient {
  return client || new OpenCodeClient({
    baseUrl: process.env.OPENCODE_BASE_URL || undefined,
    model: process.env.OPENCODE_MODEL || undefined,
    providerId: process.env.OPENCODE_PROVIDER_ID || undefined,
  });
}

export async function generateResumeForJob(client: OpenCodeClient, job: JobRecord): Promise<ResumePayload> {
  const profileMd = await getProfileForLlm();
  const personal = await getPersonalData();
  console.log(`[generator] Resume for ${job.company} - ${job.title}...`);
  const prompt = buildResumePrompt(job, profileMd, personal);
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
  const appPrefs = await getApplicationPrefsForLlm();
  console.log("[generator] Application copy...");
  const prompt = buildApplicationPrompt(job, resume, appPrefs);
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
  const c = getClient(client);

  const dir = join(JOBS_DIR, slug(job.company));
  mkdirSync(dir, { recursive: true });
  await ensurePersistedJob(job);

  const resume = await generateResumeForJob(c, job);
  writeJson(join(dir, "resume.json"), resume);

  const pdfPath = await compilePdf(job, resume);
  console.log(`[generator] PDF saved: ${pdfPath}`);
  await jobDocuments.instance.save({ jobId: job.id, type: "cv", filePath: pdfPath, metadata: { score } });

  const app = await generateApplicationForJob(c, job, resume);
  writeJson(join(dir, "application.json"), app);

  const md = renderApplicationMarkdown(job, app);
  writeText(join(dir, "application.md"), md);
  await jobDocuments.instance.save({ jobId: job.id, type: "cover_letter", content: app.cover_letter, filePath: join(dir, "application.md"), metadata: { email_subject: app.email_subject } });

  return resume;
}

export async function generateCvDocument(job: JobRecord, score: number, client?: OpenCodeClient): Promise<string> {
  const c = getClient(client);
  const dir = join(JOBS_DIR, slug(job.company));
  mkdirSync(dir, { recursive: true });
  await ensurePersistedJob(job);

  const resume = await generateResumeForJob(c, job);
  writeJson(join(dir, "resume.json"), resume);

  const pdfPath = await compilePdf(job, resume);
  console.log(`[generator] CV PDF saved: ${pdfPath}`);
  await jobDocuments.instance.save({ jobId: job.id, type: "cv", filePath: pdfPath, metadata: { score } });

  return pdfPath;
}

export async function generateCoverLetterDocument(job: JobRecord, client?: OpenCodeClient): Promise<string> {
  const c = getClient(client);
  const dir = join(JOBS_DIR, slug(job.company));
  mkdirSync(dir, { recursive: true });
  await ensurePersistedJob(job);

  const resume = await generateResumeForJob(c, job);
  const app = await generateApplicationForJob(c, job, resume);

  writeJson(join(dir, "application.json"), app);
  const md = renderApplicationMarkdown(job, app);
  writeText(join(dir, "application.md"), md);

  await jobDocuments.instance.save({
    jobId: job.id,
    type: "cover_letter",
    content: app.cover_letter,
    filePath: join(dir, "application.md"),
    metadata: { email_subject: app.email_subject },
  });

  return app.cover_letter;
}

export async function generateRecommendationDocument(job: JobRecord, client?: OpenCodeClient): Promise<string> {
  const c = getClient(client);
  const dir = join(JOBS_DIR, slug(job.company));
  mkdirSync(dir, { recursive: true });
  await ensurePersistedJob(job);

  const docsContext = [
    "Create useful application support documents from the saved candidate profile and answers.",
    await getApplicationPrefsForLlm(),
  ].join("\n\n");
  const prompt = buildDocumentPrompt("recommendation", job, docsContext);
  const result = await c.completeJson(prompt.system, prompt.user);
  const parsed = parseJsonFromText<Record<string, string>>(result);
  const content = parsed.content || result;

  await jobDocuments.instance.save({
    jobId: job.id,
    type: "recommendation",
    content,
    metadata: { score: null },
  });

  return content;
}

async function ensurePersistedJob(job: JobRecord): Promise<void> {
  const companySlug = slug(job.company);
  let company = await companies.instance.getBySlug(companySlug);
  if (!company) {
    await companies.instance.save({
      slug: companySlug,
      name: job.company,
      ats: (job.site || "manual") as any,
      endpoint: job.url || `manual:${companySlug}`,
    });
    company = await companies.instance.getBySlug(companySlug);
  }
  if (!company) throw new Error(`Failed to create company for ${job.company}`);

  if (!(await jobs.instance.getById(job.id))) {
    await jobs.instance.save({
      id: job.id,
      companyId: company.id,
      externalId: externalIdFromJob(job),
      url: job.url,
      title: job.title,
      location: job.location,
      description: job.description,
    });
  }
}

function externalIdFromJob(job: JobRecord): string {
  if (job.site === "greenhouse") return job.id.replace(/^gh-/, "");
  if (job.site === "lever") return job.id.replace(/^lever-/, "");
  if (job.site === "ashby") return job.id.replace(/^ashby-/, "");
  return job.id;
}

import { join } from "path";
import { mkdirSync } from "fs";
import { OpenCodeClient } from "../shared/llm";
import type {
  JobRecord,
  ApplicationPayload,
  ProfileData,
  TailoredResumeContent,
} from "../shared/types";
import { readText, writeJson, writeText } from "../shared/utils";
import { generateResume } from "./latex";
import { resumeSchema, applicationSchema } from "../schemas/index";
import {
  buildResumePrompt,
  buildApplicationPrompt,
  buildDocumentPrompt,
} from "../shared/prompts";
import { companies, jobs, jobDocuments, userProfile } from "../db";
import {
  APP_ROOT,
  slug,
  normalizeTailoredResumeContent,
  structureDataForLLM,
  getApplicationPrefsForLlm,
  renderApplicationMarkdown,
  parseJsonFromText,
  JOBS_DIR,
  SKILLS_DIR,
} from "../shared/index";
import type { UserProfileRow } from "../db/repositories/userProfile";

function getClient(client?: OpenCodeClient): OpenCodeClient {
  return (
    client ||
    new OpenCodeClient({
      baseUrl: process.env.OPENCODE_BASE_URL || undefined,
      model: process.env.OPENCODE_MODEL || undefined,
      providerId: process.env.OPENCODE_PROVIDER_ID || undefined,
    })
  );
}

function buildProfileData(profile: UserProfileRow): ProfileData {
  return {
    name: profile.fullName,
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    linkedin: profile.linkedin,
    portfolio: profile.portfolio || undefined,
    github: profile.github || undefined,
    skills: JSON.parse(profile.skillsJson),
    experience: JSON.parse(profile.experienceJson),
    projects: JSON.parse(profile.projectsJson),
    education: JSON.parse(profile.educationJson),
  };
}

export async function generateResumeForJob(
  client: OpenCodeClient,
  job: JobRecord,
  profile: ProfileData,
): Promise<TailoredResumeContent> {
  if (!profile) throw new Error("there is no profile data");
  const cvInstrctions = readText(join(SKILLS_DIR, "cv_profile.md"));

  const data = {
    skills: profile.skills,
    experience: profile.experience,
    projects: profile.projects,
  };

  const profileMd = await structureDataForLLM(data);
  console.log(`[generator] Resume for ${job.company} - ${job.title}...`);
  const { system, user } = buildResumePrompt(job, cvInstrctions, profileMd);
  const resume = await client.createResume(system, user);
  const normalized = normalizeTailoredResumeContent(resume);

  const parsed = resumeSchema.safeParse(normalized);
  if (!parsed.success) {
    const debugPath = join(
      APP_ROOT,
      "data",
      "debug",
      `resume-${slug(job.company)}-${slug(job.title)}.json`,
    );
    writeJson(debugPath, {
      job,
      raw: resume,
      normalized,
      issues: parsed.error.issues,
    });
    throw new Error(
      `Resume schema mismatch for ${job.company}. See ${debugPath}`,
    );
  }
  return parsed.data;
}

export async function generateApplicationForJob(
  client: OpenCodeClient,
  job: JobRecord,
  resume: TailoredResumeContent,
): Promise<ApplicationPayload> {
  const appPrefs = await getApplicationPrefsForLlm();
  console.log("[generator] Application copy...");
  const prompt = buildApplicationPrompt(job, resume, appPrefs);
  const application = await client.createApplication(
    prompt.system,
    prompt.user,
  );
  return applicationSchema.parse(application);
}

export async function compilePdf(
  job: JobRecord,
  resume: TailoredResumeContent,
  profileData: ProfileData,
): Promise<string> {
  const jobDir = join(JOBS_DIR, slug(job.company));
  mkdirSync(jobDir, { recursive: true });

  const resumePath = join(jobDir, "resume.json");
  writeJson(resumePath, resume);

  const pdfPath = join(
    jobDir,
    `${slug(profileData.name)}-${slug(job.title)}-${slug(job.company)}-cv.pdf`,
  );
  await generateResume(resumePath, profileData, pdfPath);
  return pdfPath;
}

export async function makeCvForJob(
  job: JobRecord,
  score: number,
  client?: OpenCodeClient,
): Promise<TailoredResumeContent> {
  const profile = await userProfile.instance.get();
  if (!profile)
    throw new Error("there is no profile data now you can't generate CV");

  const newProf = buildProfileData(profile);

  const c = getClient(client);

  const dir = join(JOBS_DIR, slug(job.company));
  mkdirSync(dir, { recursive: true });
  await ensurePersistedJob(job);

  const resume = await generateResumeForJob(c, job, newProf);
  writeJson(join(dir, "resume.json"), resume);

  const pdfPath = await compilePdf(job, resume, newProf);
  console.log(`[generator] PDF saved: ${pdfPath}`);
  await jobDocuments.instance.save({
    jobId: job.id,
    type: "cv",
    filePath: pdfPath,
    metadata: { score },
  });

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

  return resume;
}

export async function generateCvDocument(
  job: JobRecord,
  client?: OpenCodeClient,
): Promise<string> {
  const c = getClient(client);
  const dir = join(JOBS_DIR, slug(job.company));
  mkdirSync(dir, { recursive: true });
  await ensurePersistedJob(job);

  const profile = await userProfile.instance.get();
  if (!profile)
    throw new Error("there is no profile data now you can't generate CV");

  const newProf = buildProfileData(profile);

  const resume = await generateResumeForJob(c, job , newProf);
  writeJson(join(dir, "resume.json"), resume);

  const pdfPath = await compilePdf(job, resume, newProf);
  console.log(`[generator] CV PDF saved: ${pdfPath}`);
  await jobDocuments.instance.save({
    jobId: job.id,
    type: "cv",
    filePath: pdfPath,
  });

  return pdfPath;
}

export async function generateCoverLetterDocument(
  job: JobRecord,
  client?: OpenCodeClient,
): Promise<string> {
  const c = getClient(client);
  const dir = join(JOBS_DIR, slug(job.company));
  mkdirSync(dir, { recursive: true });
  await ensurePersistedJob(job);


  const profile = await userProfile.instance.get();
  if (!profile)
    throw new Error("there is no profile data now you can't generate CV");

  const newProf = buildProfileData(profile);

  const resume = await generateResumeForJob(c, job , newProf);
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

export async function generateRecommendationDocument(
  job: JobRecord,
  client?: OpenCodeClient,
): Promise<string> {
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

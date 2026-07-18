import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JobsRepository, JobDocumentsRepository, UserProfileRepository, UserAnswersRepository } from "../database/repositories";
import type { JobWithCompany } from "../database/repositories/jobs.repository";
import type { UserProfileRow } from "../database/repositories/user-profile.repository";
import { OpenCodeClient, parseJsonFromText } from "../shared/llm";
import { LatexService } from "./latex.service";
import { renderApplicationMarkdown } from "../shared/documents";
import { structureDataForLLM, getApplicationPrefsForLlm } from "../shared/personal";
import { buildResumePrompt, buildApplicationPrompt, buildDocumentPrompt } from "../shared/prompts";
import { resumeSchema, applicationSchema } from "../shared/schemas";
import { normalizeTailoredResumeContent } from "../shared/resume";
import { JOBS_DIR, DATA_DIR, SKILLS_DIR, resolveContainedPath, slug } from "../common/paths";
import { readText } from "../shared/utils";
import { join, basename } from "path";
import { mkdirSync, writeFileSync, existsSync } from "fs";
import { AppException } from "../common/errors";
import type { EnvConfig } from "../config/env";
import type { JobRecord, ProfileData, TailoredResumeContent, ApplicationPayload } from "../shared/types";

export type GeneratedDocument = {
  id: string;
  jobId: string;
  type: string;
  status: string;
  content: string;
  filePath: string;
  downloadUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class GeneratorService {
  private readonly logger = new Logger(GeneratorService.name);
  private readonly client: OpenCodeClient;

  constructor(
    private readonly config: ConfigService<EnvConfig>,
    private readonly jobs: JobsRepository,
    private readonly documents: JobDocumentsRepository,
    private readonly profile: UserProfileRepository,
    private readonly userAnswers: UserAnswersRepository,
    private readonly latex: LatexService,
  ) {
    this.client = OpenCodeClient.fromConfig(this.config);
  }

  async list(jobId: string): Promise<GeneratedDocument[]> {
    const docs = await this.documents.getByJobId(jobId);
    return docs.map((d) => this.serialize(jobId, d));
  }

  async get(jobId: string, documentId: string): Promise<GeneratedDocument> {
    const doc = (await this.documents.getByJobId(jobId)).find((d) => d.id === documentId);
    if (!doc) throw new AppException(404, "Document not found");
    return this.serialize(jobId, doc);
  }

  async download(jobId: string, documentId: string): Promise<{ filePath: string; fileName: string; contentType: string }> {
    const doc = await this.documents.getById(documentId);
    if (!doc || doc.jobId !== jobId) throw new AppException(404, "Document not found");
    const filePath = doc.filePath ? resolveContainedPath(JOBS_DIR, doc.filePath) : null;
    if (!filePath) throw new AppException(403, "Invalid document path");
    if (!existsSync(filePath)) throw new AppException(404, "Document file not found");
    const fileName = basename(filePath);
    const contentType = fileName.endsWith(".pdf")
      ? "application/pdf"
      : fileName.endsWith(".md")
        ? "text/markdown"
        : "application/octet-stream";
    return { filePath, fileName, contentType };
  }

  async generate(jobId: string, type: string, force = false): Promise<{ exists: boolean; document?: GeneratedDocument; message: string }> {
    if (!["cv", "cover_letter", "recommendation"].includes(type)) {
      throw new AppException(400, "type must be cv, cover_letter, or recommendation");
    }
    const jobRow = await this.jobs.getById(jobId);
    if (!jobRow) throw new AppException(404, "Job not found");

    const existing = (await this.documents.getByJobId(jobId)).find((d) => d.type === type);
    if (existing && !force) {
      return { exists: true, document: this.serialize(jobId, existing), message: `${formatType(type)} already exists` };
    }

    const profileRow = await this.profile.get();
    if (!profileRow) throw new AppException(400, "No profile data — set up your profile before generating documents");

    const jobRecord = toJobRecord(jobRow);
    const profileData = buildProfileData(profileRow);
    const jobDir = join(JOBS_DIR, jobRow.companySlug, jobId);
    mkdirSync(jobDir, { recursive: true });

    let id: string;
    if (type === "cv") {
      id = await this.generateCv(jobId, jobRow.companySlug, jobDir, jobRecord, profileData);
    } else if (type === "cover_letter") {
      id = await this.generateCoverLetter(jobId, jobRow.companySlug, jobDir, jobRecord, profileData, profileRow);
    } else {
      id = await this.generateRecommendation(jobId, jobRecord, profileRow);
    }

    const doc = await this.documents.getById(id);
    return {
      exists: false,
      document: doc ? this.serialize(jobId, doc) : undefined,
      message: `${formatType(type)} ${force ? "regenerated" : "generated"}`,
    };
  }

  private async generateResumeForJob(job: JobRecord, profile: ProfileData): Promise<TailoredResumeContent> {
    const cvInstructions = readSkill("cv_profile.md");
    const profileMd = structureDataForLLM({ skills: profile.skills, experience: profile.experience, projects: profile.projects });
    this.logger.log(`Generating resume for ${job.company} - ${job.title}`);
    const { system, user } = buildResumePrompt(job, cvInstructions, profileMd);
    const resume = await this.client.createResume(system, user);
    const normalized = normalizeTailoredResumeContent(resume);

    const parsed = resumeSchema.safeParse(normalized);
    if (!parsed.success) {
      const debugPath = join(DATA_DIR, "debug", `resume-${slug(job.company)}-${slug(job.title)}.json`);
      mkdirSync(join(DATA_DIR, "debug"), { recursive: true });
      writeFileSync(
        debugPath,
        JSON.stringify({ job, raw: resume, normalized, issues: parsed.error.issues }, null, 2),
        "utf-8",
      );
      throw new AppException(502, `Resume schema mismatch for ${job.company}. See ${debugPath}`);
    }
    return parsed.data;
  }

  private async generateApplicationForJob(
    job: JobRecord,
    resume: TailoredResumeContent,
    profileRow: UserProfileRow,
  ): Promise<ApplicationPayload> {
    const answers = await this.userAnswers.getAll();
    const appPrefs = getApplicationPrefsForLlm(profileRow, answers);
    this.logger.log(`Generating application copy for ${job.company} - ${job.title}`);
    const prompt = buildApplicationPrompt(job, resume, appPrefs);
    const application = await this.client.createApplication(prompt.system, prompt.user);
    return applicationSchema.parse(application);
  }

  private async getOrGenerateResume(
    jobId: string,
    job: JobRecord,
    profile: ProfileData,
  ): Promise<TailoredResumeContent> {
    const cvDoc = (await this.documents.getByJobId(jobId)).find((d) => d.type === "cv");
    if (cvDoc?.content) {
      try {
        return JSON.parse(cvDoc.content) as TailoredResumeContent;
      } catch {
        // fall through to regeneration if the stored content isn't valid resume JSON
      }
    }
    return this.generateResumeForJob(job, profile);
  }

  private async generateCv(
    jobId: string,
    companySlug: string,
    jobDir: string,
    job: JobRecord,
    profile: ProfileData,
  ): Promise<string> {
    const resume = await this.generateResumeForJob(job, profile);
    writeFileSync(join(jobDir, "resume.json"), JSON.stringify(resume, null, 2), "utf-8");

    const tex = this.latex.buildTex(resume, profile);
    const pdfFileName = `${slug(profile.name)}-${slug(job.title)}-${slug(job.company)}-cv.pdf`;
    const pdfPath = join(jobDir, pdfFileName);
    await this.latex.compilePdf(tex, pdfPath);
    this.logger.log(`CV PDF saved: ${pdfPath}`);

    const id = `doc-${jobId}-cv-${Date.now().toString(36)}`;
    const now = new Date().toISOString();
    await this.documents.save({
      id,
      jobId,
      type: "cv",
      status: "ready",
      content: JSON.stringify(resume),
      filePath: `${companySlug}/${jobId}/${pdfFileName}`,
      createdAt: now,
      updatedAt: now,
    });
    return id;
  }

  private async generateCoverLetter(
    jobId: string,
    companySlug: string,
    jobDir: string,
    job: JobRecord,
    profile: ProfileData,
    profileRow: UserProfileRow,
  ): Promise<string> {
    const resume = await this.getOrGenerateResume(jobId, job, profile);
    const app = await this.generateApplicationForJob(job, resume, profileRow);

    writeFileSync(join(jobDir, "application.json"), JSON.stringify(app, null, 2), "utf-8");
    const md = renderApplicationMarkdown(job, app);
    writeFileSync(join(jobDir, "application.md"), md, "utf-8");

    const id = `doc-${jobId}-cover_letter-${Date.now().toString(36)}`;
    const now = new Date().toISOString();
    await this.documents.save({
      id,
      jobId,
      type: "cover_letter",
      status: "ready",
      content: app.cover_letter,
      filePath: `${companySlug}/${jobId}/application.md`,
      metadata: { email_subject: app.email_subject },
      createdAt: now,
      updatedAt: now,
    });
    return id;
  }

  private async generateRecommendation(jobId: string, job: JobRecord, profileRow: UserProfileRow): Promise<string> {
    const answers = await this.userAnswers.getAll();
    const docsContext = [
      "Create useful application support documents from the saved candidate profile and answers.",
      getApplicationPrefsForLlm(profileRow, answers),
    ].join("\n\n");
    const prompt = buildDocumentPrompt("recommendation", job, docsContext);
    const result = await this.client.completeJson(prompt.system, prompt.user);
    const parsed = parseJsonFromText<Record<string, string>>(result);
    const content = parsed.content || result;

    const id = `doc-${jobId}-recommendation-${Date.now().toString(36)}`;
    const now = new Date().toISOString();
    await this.documents.save({
      id,
      jobId,
      type: "recommendation",
      status: "ready",
      content,
      filePath: "",
      createdAt: now,
      updatedAt: now,
    });
    return id;
  }

  private serialize(jobId: string, doc: any): GeneratedDocument {
    return {
      id: doc.id,
      jobId: doc.jobId,
      type: doc.type,
      status: doc.status,
      content: doc.content,
      filePath: doc.filePath,
      downloadUrl: doc.filePath
        ? `/api/jobs/${encodeURIComponent(jobId)}/documents/${encodeURIComponent(doc.id)}/download`
        : null,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }
}

function formatType(type: string): string {
  if (type === "cv") return "CV";
  if (type === "cover_letter") return "Cover letter";
  if (type === "recommendation") return "Recommendation";
  return "Document";
}

function readSkill(name: string): string {
  try {
    return readText(join(SKILLS_DIR, name));
  } catch {
    return "";
  }
}

function toJobRecord(jobRow: JobWithCompany): JobRecord {
  return {
    id: jobRow.id,
    site: jobRow.ats,
    title: jobRow.title,
    company: jobRow.companyName,
    location: jobRow.location,
    url: jobRow.url,
    description: jobRow.description,
    posted_at: jobRow.firstSeenAt,
  };
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

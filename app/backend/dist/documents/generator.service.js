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
var GeneratorService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeneratorService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const repositories_1 = require("../database/repositories");
const llm_1 = require("../shared/llm");
const latex_service_1 = require("./latex.service");
const documents_1 = require("../shared/documents");
const personal_1 = require("../shared/personal");
const prompts_1 = require("../shared/prompts");
const schemas_1 = require("../shared/schemas");
const resume_1 = require("../shared/resume");
const paths_1 = require("../common/paths");
const utils_1 = require("../shared/utils");
const path_1 = require("path");
const fs_1 = require("fs");
const errors_1 = require("../common/errors");
let GeneratorService = GeneratorService_1 = class GeneratorService {
    config;
    jobs;
    documents;
    profile;
    userAnswers;
    latex;
    logger = new common_1.Logger(GeneratorService_1.name);
    client;
    constructor(config, jobs, documents, profile, userAnswers, latex) {
        this.config = config;
        this.jobs = jobs;
        this.documents = documents;
        this.profile = profile;
        this.userAnswers = userAnswers;
        this.latex = latex;
        this.client = llm_1.OpenCodeClient.fromConfig(this.config);
    }
    async list(jobId) {
        const docs = await this.documents.getByJobId(jobId);
        return docs.map((d) => this.serialize(jobId, d));
    }
    async get(jobId, documentId) {
        const doc = (await this.documents.getByJobId(jobId)).find((d) => d.id === documentId);
        if (!doc)
            throw new errors_1.AppException(404, "Document not found");
        return this.serialize(jobId, doc);
    }
    async download(jobId, documentId) {
        const doc = await this.documents.getById(documentId);
        if (!doc || doc.jobId !== jobId)
            throw new errors_1.AppException(404, "Document not found");
        const filePath = doc.filePath ? (0, paths_1.resolveContainedPath)(paths_1.JOBS_DIR, doc.filePath) : null;
        if (!filePath)
            throw new errors_1.AppException(403, "Invalid document path");
        if (!(0, fs_1.existsSync)(filePath))
            throw new errors_1.AppException(404, "Document file not found");
        const fileName = (0, path_1.basename)(filePath);
        const contentType = fileName.endsWith(".pdf")
            ? "application/pdf"
            : fileName.endsWith(".md")
                ? "text/markdown"
                : "application/octet-stream";
        return { filePath, fileName, contentType };
    }
    async generate(jobId, type, force = false) {
        if (!["cv", "cover_letter", "recommendation"].includes(type)) {
            throw new errors_1.AppException(400, "type must be cv, cover_letter, or recommendation");
        }
        const jobRow = await this.jobs.getById(jobId);
        if (!jobRow)
            throw new errors_1.AppException(404, "Job not found");
        const existing = (await this.documents.getByJobId(jobId)).find((d) => d.type === type);
        if (existing && !force) {
            return { exists: true, document: this.serialize(jobId, existing), message: `${formatType(type)} already exists` };
        }
        const profileRow = await this.profile.get();
        if (!profileRow)
            throw new errors_1.AppException(400, "No profile data — set up your profile before generating documents");
        const jobRecord = toJobRecord(jobRow);
        const profileData = buildProfileData(profileRow);
        const jobDir = (0, path_1.join)(paths_1.JOBS_DIR, jobRow.companySlug, jobId);
        (0, fs_1.mkdirSync)(jobDir, { recursive: true });
        let id;
        if (type === "cv") {
            id = await this.generateCv(jobId, jobRow.companySlug, jobDir, jobRecord, profileData);
        }
        else if (type === "cover_letter") {
            id = await this.generateCoverLetter(jobId, jobRow.companySlug, jobDir, jobRecord, profileData, profileRow);
        }
        else {
            id = await this.generateRecommendation(jobId, jobRecord, profileRow);
        }
        const doc = await this.documents.getById(id);
        return {
            exists: false,
            document: doc ? this.serialize(jobId, doc) : undefined,
            message: `${formatType(type)} ${force ? "regenerated" : "generated"}`,
        };
    }
    async generateResumeForJob(job, profile) {
        const cvInstructions = readSkill("cv_profile.md");
        const profileMd = (0, personal_1.structureDataForLLM)({ skills: profile.skills, experience: profile.experience, projects: profile.projects });
        this.logger.log(`Generating resume for ${job.company} - ${job.title}`);
        const { system, user } = (0, prompts_1.buildResumePrompt)(job, cvInstructions, profileMd);
        const resume = await this.client.createResume(system, user);
        const normalized = (0, resume_1.normalizeTailoredResumeContent)(resume);
        const parsed = schemas_1.resumeSchema.safeParse(normalized);
        if (!parsed.success) {
            const debugPath = (0, path_1.join)(paths_1.DATA_DIR, "debug", `resume-${(0, paths_1.slug)(job.company)}-${(0, paths_1.slug)(job.title)}.json`);
            (0, fs_1.mkdirSync)((0, path_1.join)(paths_1.DATA_DIR, "debug"), { recursive: true });
            (0, fs_1.writeFileSync)(debugPath, JSON.stringify({ job, raw: resume, normalized, issues: parsed.error.issues }, null, 2), "utf-8");
            throw new errors_1.AppException(502, `Resume schema mismatch for ${job.company}. See ${debugPath}`);
        }
        return parsed.data;
    }
    async generateApplicationForJob(job, resume, profileRow) {
        const answers = await this.userAnswers.getAll();
        const appPrefs = (0, personal_1.getApplicationPrefsForLlm)(profileRow, answers);
        this.logger.log(`Generating application copy for ${job.company} - ${job.title}`);
        const prompt = (0, prompts_1.buildApplicationPrompt)(job, resume, appPrefs);
        const application = await this.client.createApplication(prompt.system, prompt.user);
        return schemas_1.applicationSchema.parse(application);
    }
    async getOrGenerateResume(jobId, job, profile) {
        const cvDoc = (await this.documents.getByJobId(jobId)).find((d) => d.type === "cv");
        if (cvDoc?.content) {
            try {
                return JSON.parse(cvDoc.content);
            }
            catch {
            }
        }
        return this.generateResumeForJob(job, profile);
    }
    async generateCv(jobId, companySlug, jobDir, job, profile) {
        const resume = await this.generateResumeForJob(job, profile);
        (0, fs_1.writeFileSync)((0, path_1.join)(jobDir, "resume.json"), JSON.stringify(resume, null, 2), "utf-8");
        const tex = this.latex.buildTex(resume, profile);
        const pdfFileName = `${(0, paths_1.slug)(profile.name)}-${(0, paths_1.slug)(job.title)}-${(0, paths_1.slug)(job.company)}-cv.pdf`;
        const pdfPath = (0, path_1.join)(jobDir, pdfFileName);
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
    async generateCoverLetter(jobId, companySlug, jobDir, job, profile, profileRow) {
        const resume = await this.getOrGenerateResume(jobId, job, profile);
        const app = await this.generateApplicationForJob(job, resume, profileRow);
        (0, fs_1.writeFileSync)((0, path_1.join)(jobDir, "application.json"), JSON.stringify(app, null, 2), "utf-8");
        const md = (0, documents_1.renderApplicationMarkdown)(job, app);
        (0, fs_1.writeFileSync)((0, path_1.join)(jobDir, "application.md"), md, "utf-8");
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
    async generateRecommendation(jobId, job, profileRow) {
        const answers = await this.userAnswers.getAll();
        const docsContext = [
            "Create useful application support documents from the saved candidate profile and answers.",
            (0, personal_1.getApplicationPrefsForLlm)(profileRow, answers),
        ].join("\n\n");
        const prompt = (0, prompts_1.buildDocumentPrompt)("recommendation", job, docsContext);
        const result = await this.client.completeJson(prompt.system, prompt.user);
        const parsed = (0, llm_1.parseJsonFromText)(result);
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
    serialize(jobId, doc) {
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
};
exports.GeneratorService = GeneratorService;
exports.GeneratorService = GeneratorService = GeneratorService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        repositories_1.JobsRepository,
        repositories_1.JobDocumentsRepository,
        repositories_1.UserProfileRepository,
        repositories_1.UserAnswersRepository,
        latex_service_1.LatexService])
], GeneratorService);
function formatType(type) {
    if (type === "cv")
        return "CV";
    if (type === "cover_letter")
        return "Cover letter";
    if (type === "recommendation")
        return "Recommendation";
    return "Document";
}
function readSkill(name) {
    try {
        return (0, utils_1.readText)((0, path_1.join)(paths_1.SKILLS_DIR, name));
    }
    catch {
        return "";
    }
}
function toJobRecord(jobRow) {
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
function buildProfileData(profile) {
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
//# sourceMappingURL=generator.service.js.map
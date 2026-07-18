"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDocumentSchema = exports.generateCvSchema = exports.extractJobSchema = exports.createManualJobSchema = exports.createCompanySchema = exports.putProfileSchema = exports.putConfigSchema = exports.updateApplicationStatusSchema = exports.listTasksQuerySchema = exports.createTaskSchema = void 0;
const zod_1 = require("zod");
exports.createTaskSchema = zod_1.z.object({
    type: zod_1.z.string().min(1),
    payload: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional().default({}),
    dedupeKey: zod_1.z.string().optional(),
    waitForCompletion: zod_1.z.boolean().optional(),
});
exports.listTasksQuerySchema = zod_1.z.object({
    limit: zod_1.z.coerce.number().int().min(1).max(500).default(100),
    status: zod_1.z.enum(["queued", "running", "completed", "failed", "cancelled"]).optional(),
});
exports.updateApplicationStatusSchema = zod_1.z.object({
    status: zod_1.z.enum([
        "approved",
        "ready",
        "applied",
        "interviewing",
        "offer",
        "rejected",
        "ghosted",
        "withdrawn",
    ]),
});
exports.putConfigSchema = zod_1.z.object({
    roles: zod_1.z.array(zod_1.z.string()).optional(),
    location: zod_1.z.array(zod_1.z.string()).optional(),
    exclude: zod_1.z.array(zod_1.z.string()).optional(),
    ats: zod_1.z.array(zod_1.z.string()).optional(),
    min_score: zod_1.z.number().int().min(0).max(100).optional(),
    discovery_interval_hours: zod_1.z.number().int().positive().optional(),
    targetCompanies: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.putProfileSchema = zod_1.z.object({
    fullName: zod_1.z.string().optional(),
    headline: zod_1.z.string().optional(),
    location: zod_1.z.string().optional(),
    email: zod_1.z.string().optional(),
    phone: zod_1.z.string().optional(),
    linkedin: zod_1.z.string().optional(),
    portfolio: zod_1.z.string().optional(),
    github: zod_1.z.string().optional(),
    summary: zod_1.z.string().optional(),
    skillsJson: zod_1.z.string().optional(),
    experienceJson: zod_1.z.string().optional(),
    projectsJson: zod_1.z.string().optional(),
    educationJson: zod_1.z.string().optional(),
    preferencesJson: zod_1.z.string().optional(),
});
exports.createCompanySchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    slug: zod_1.z.string().min(1).optional(),
    ats: zod_1.z.enum(["greenhouse", "lever", "ashby", "custom"]),
    endpoint: zod_1.z.string().min(1),
});
exports.createManualJobSchema = zod_1.z.object({
    company: zod_1.z.string().min(1),
    title: zod_1.z.string().min(1),
    location: zod_1.z.string().optional().default(""),
    url: zod_1.z.string().optional().default(""),
    description: zod_1.z.string().min(1),
});
exports.extractJobSchema = zod_1.z.object({
    text: zod_1.z.string().min(1),
    url: zod_1.z.string().url().optional(),
});
exports.generateCvSchema = zod_1.z.object({
    jobId: zod_1.z.string().min(1),
    profileText: zod_1.z.string().optional(),
});
exports.generateDocumentSchema = zod_1.z.object({
    type: zod_1.z.enum(["cv", "cover_letter", "recommendation"]),
    force: zod_1.z.boolean().optional(),
});
//# sourceMappingURL=dto.js.map
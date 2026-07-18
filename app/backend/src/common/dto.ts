import { z } from "zod";

export const createTaskSchema = z.object({
  type: z.string().min(1),
  payload: z.record(z.string(), z.any()).optional().default({}),
  dedupeKey: z.string().optional(),
  waitForCompletion: z.boolean().optional(),
});

export const listTasksQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(500).default(100),
  status: z.enum(["queued", "running", "completed", "failed", "cancelled"]).optional(),
});

export const updateApplicationStatusSchema = z.object({
  status: z.enum([
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

export const putConfigSchema = z.object({
  roles: z.array(z.string()).optional(),
  location: z.array(z.string()).optional(),
  exclude: z.array(z.string()).optional(),
  ats: z.array(z.string()).optional(),
  min_score: z.number().int().min(0).max(100).optional(),
  discovery_interval_hours: z.number().int().positive().optional(),
  targetCompanies: z.array(z.string()).optional(),
});

export const putProfileSchema = z.object({
  fullName: z.string().optional(),
  headline: z.string().optional(),
  location: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  linkedin: z.string().optional(),
  portfolio: z.string().optional(),
  github: z.string().optional(),
  summary: z.string().optional(),
  skillsJson: z.string().optional(),
  experienceJson: z.string().optional(),
  projectsJson: z.string().optional(),
  educationJson: z.string().optional(),
  preferencesJson: z.string().optional(),
});

export const createCompanySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  ats: z.enum(["greenhouse", "lever", "ashby", "custom"]),
  endpoint: z.string().min(1),
});

export const createManualJobSchema = z.object({
  company: z.string().min(1),
  title: z.string().min(1),
  location: z.string().optional().default(""),
  url: z.string().optional().default(""),
  description: z.string().min(1),
});

export const extractJobSchema = z.object({
  text: z.string().min(1),
  url: z.string().url().optional(),
});

export const generateCvSchema = z.object({
  jobId: z.string().min(1),
  profileText: z.string().optional(),
});

export const generateDocumentSchema = z.object({
  type: z.enum(["cv", "cover_letter", "recommendation"]),
  force: z.boolean().optional(),
});

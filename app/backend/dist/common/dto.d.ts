import { z } from "zod";
export declare const createTaskSchema: z.ZodObject<{
    type: z.ZodString;
    payload: z.ZodDefault<z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>>;
    dedupeKey: z.ZodOptional<z.ZodString>;
    waitForCompletion: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;
export declare const listTasksQuerySchema: z.ZodObject<{
    limit: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    status: z.ZodOptional<z.ZodEnum<{
        running: "running";
        queued: "queued";
        completed: "completed";
        failed: "failed";
        cancelled: "cancelled";
    }>>;
}, z.core.$strip>;
export declare const updateApplicationStatusSchema: z.ZodObject<{
    status: z.ZodEnum<{
        ready: "ready";
        approved: "approved";
        applied: "applied";
        interviewing: "interviewing";
        offer: "offer";
        rejected: "rejected";
        ghosted: "ghosted";
        withdrawn: "withdrawn";
    }>;
}, z.core.$strip>;
export declare const putConfigSchema: z.ZodObject<{
    roles: z.ZodOptional<z.ZodArray<z.ZodString>>;
    location: z.ZodOptional<z.ZodArray<z.ZodString>>;
    exclude: z.ZodOptional<z.ZodArray<z.ZodString>>;
    ats: z.ZodOptional<z.ZodArray<z.ZodString>>;
    min_score: z.ZodOptional<z.ZodNumber>;
    discovery_interval_hours: z.ZodOptional<z.ZodNumber>;
    targetCompanies: z.ZodOptional<z.ZodArray<z.ZodString>>;
}, z.core.$strip>;
export declare const putProfileSchema: z.ZodObject<{
    fullName: z.ZodOptional<z.ZodString>;
    headline: z.ZodOptional<z.ZodString>;
    location: z.ZodOptional<z.ZodString>;
    email: z.ZodOptional<z.ZodString>;
    phone: z.ZodOptional<z.ZodString>;
    linkedin: z.ZodOptional<z.ZodString>;
    portfolio: z.ZodOptional<z.ZodString>;
    github: z.ZodOptional<z.ZodString>;
    summary: z.ZodOptional<z.ZodString>;
    skillsJson: z.ZodOptional<z.ZodString>;
    experienceJson: z.ZodOptional<z.ZodString>;
    projectsJson: z.ZodOptional<z.ZodString>;
    educationJson: z.ZodOptional<z.ZodString>;
    preferencesJson: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const createCompanySchema: z.ZodObject<{
    name: z.ZodString;
    slug: z.ZodOptional<z.ZodString>;
    ats: z.ZodEnum<{
        greenhouse: "greenhouse";
        lever: "lever";
        ashby: "ashby";
        custom: "custom";
    }>;
    endpoint: z.ZodString;
}, z.core.$strip>;
export declare const createManualJobSchema: z.ZodObject<{
    company: z.ZodString;
    title: z.ZodString;
    location: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    url: z.ZodDefault<z.ZodOptional<z.ZodString>>;
    description: z.ZodString;
}, z.core.$strip>;
export declare const extractJobSchema: z.ZodObject<{
    text: z.ZodString;
    url: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const generateCvSchema: z.ZodObject<{
    jobId: z.ZodString;
    profileText: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export declare const generateDocumentSchema: z.ZodObject<{
    type: z.ZodEnum<{
        cv: "cv";
        cover_letter: "cover_letter";
        recommendation: "recommendation";
    }>;
    force: z.ZodOptional<z.ZodBoolean>;
}, z.core.$strip>;

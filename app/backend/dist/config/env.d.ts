import "dotenv/config";
import { z } from "zod";
export declare const envSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<{
        development: "development";
        production: "production";
        test: "test";
    }>>;
    PORT: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    DATABASE_URL: z.ZodDefault<z.ZodString>;
    DATABASE_POOL_SIZE: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    REDIS_URL: z.ZodDefault<z.ZodString>;
    TASK_QUEUE_NAME: z.ZodDefault<z.ZodString>;
    APPLY_QUEUE_NAME: z.ZodDefault<z.ZodString>;
    WORKER_CONCURRENCY: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    ENABLE_WORKER: z.ZodPipe<z.ZodDefault<z.ZodString>, z.ZodTransform<boolean, string>>;
    APPLY_WORKER: z.ZodPipe<z.ZodDefault<z.ZodString>, z.ZodTransform<boolean, string>>;
    POLL_INTERVAL_HOURS: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>>;
    DISCOVERY_INTERVAL_HOURS: z.ZodDefault<z.ZodOptional<z.ZodNullable<z.ZodCoercedNumber<unknown>>>>;
    DISCOVERY_PROVIDER: z.ZodDefault<z.ZodEnum<{
        serpapi: "serpapi";
        playwright: "playwright";
    }>>;
    SERPAPI_KEY: z.ZodOptional<z.ZodString>;
    SERP_API_KEY: z.ZodOptional<z.ZodString>;
    LLM_PROVIDER: z.ZodDefault<z.ZodEnum<{
        opencode: "opencode";
        anthropic: "anthropic";
        openai: "openai";
    }>>;
    LLM_MODEL: z.ZodOptional<z.ZodString>;
    LLM_API_KEY: z.ZodOptional<z.ZodString>;
    LLM_BASE_URL: z.ZodOptional<z.ZodString>;
    OPENCODE_BASE_URL: z.ZodDefault<z.ZodString>;
    OPENCODE_MODEL: z.ZodOptional<z.ZodString>;
    OPENCODE_PROVIDER_ID: z.ZodOptional<z.ZodString>;
    OPENCODE_TIMEOUT_MS: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    ADMIN_API_TOKEN: z.ZodOptional<z.ZodString>;
    ENABLE_QUEUE_ADMIN: z.ZodPipe<z.ZodDefault<z.ZodString>, z.ZodTransform<boolean, string>>;
    APPLY_KEEP_BROWSER_ON_BLOCK: z.ZodPipe<z.ZodDefault<z.ZodString>, z.ZodTransform<boolean, string>>;
    DATA_DIR: z.ZodOptional<z.ZodString>;
    SKILLS_DIR: z.ZodOptional<z.ZodString>;
    FRONTEND_DIST: z.ZodOptional<z.ZodString>;
    TEMPLATES_DIR: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
export type EnvConfig = z.infer<typeof envSchema>;
export declare const env: EnvConfig;

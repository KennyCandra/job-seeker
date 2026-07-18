import "dotenv/config";
import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z
    .string()
    .default("postgres://cv_autopilot:cv_autopilot@localhost:5432/cv_autopilot"),
  DATABASE_POOL_SIZE: z.coerce.number().int().positive().default(10),
  REDIS_URL: z.string().default("redis://localhost:6379"),

  TASK_QUEUE_NAME: z.string().default("cv-autopilot-tasks-v2"),
  APPLY_QUEUE_NAME: z.string().default("cv-autopilot-apply-v2"),

  WORKER_CONCURRENCY: z.coerce.number().int().min(1).default(3),
  ENABLE_WORKER: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
  APPLY_WORKER: z
    .string()
    .default("false")
    .transform((v) => v === "true"),

  POLL_INTERVAL_HOURS: z.coerce.number().nullish().default(null),
  DISCOVERY_INTERVAL_HOURS: z.coerce.number().nullish().default(null),
  DISCOVERY_PROVIDER: z.enum(["serpapi", "playwright"]).default("serpapi"),

  SERPAPI_KEY: z.string().optional(),
  SERP_API_KEY: z.string().optional(),

  LLM_PROVIDER: z.enum(["opencode", "anthropic", "openai"]).default("opencode"),
  LLM_MODEL: z.string().optional(),
  LLM_API_KEY: z.string().optional(),
  LLM_BASE_URL: z.string().optional(),
  OPENCODE_BASE_URL: z.string().default("http://127.0.0.1:4096"),
  OPENCODE_MODEL: z.string().optional(),
  OPENCODE_PROVIDER_ID: z.string().optional(),
  OPENCODE_TIMEOUT_MS: z.coerce.number().default(180000),

  ADMIN_API_TOKEN: z.string().optional(),
  ENABLE_QUEUE_ADMIN: z
    .string()
    .default("false")
    .transform((v) => v === "true"),

  APPLY_KEEP_BROWSER_ON_BLOCK: z
    .string()
    .default("false")
    .transform((v) => v === "true"),

  DATA_DIR: z.string().optional(),
  SKILLS_DIR: z.string().optional(),
  FRONTEND_DIST: z.string().optional(),
  TEMPLATES_DIR: z.string().optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export const env: EnvConfig = envSchema.parse(process.env);

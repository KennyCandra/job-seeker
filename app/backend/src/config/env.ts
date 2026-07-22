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

  // Daily pipeline: sync-all -> snapshot -> smart filter, once per day.
  // ENABLED turns on the hourly catch-up check (runs whenever the last
  // successful pass is older than CATCHUP_HOURS — survives the machine being
  // off at any fixed time). HOUR additionally schedules a fixed-time cron.
  DAILY_PIPELINE_ENABLED: z
    .string()
    .default("false")
    .transform((v) => v === "true"),
  DAILY_PIPELINE_HOUR: z.coerce.number().int().min(0).max(23).nullish().default(null),
  DAILY_PIPELINE_CATCHUP_HOURS: z.coerce.number().positive().default(20),
  DISCOVERY_PROVIDER: z.enum(["serpapi", "playwright"]).default("serpapi"),

  // Smart-filter (LLM) throughput controls. Rather than running the LLM over the
  // whole accepted pool in one unbounded task, each run processes at most
  // SMART_FILTER_BATCH_LIMIT jobs (0 = unlimited, legacy behaviour). The drain
  // interval enqueues one capped batch every N minutes until the backlog clears
  // (0 = disabled; drive it manually or via the daily pipeline instead).
  SMART_FILTER_BATCH_LIMIT: z.coerce.number().int().min(0).default(25),
  SMART_FILTER_DRAIN_INTERVAL_MIN: z.coerce.number().int().min(0).default(0),

  // Cheap AI pre-filter (triage) tier. Runs a small/cheap pass over jobs the
  // deterministic filter accepted, sending PREFILTER_BATCH_SIZE jobs per LLM call
  // (title + location + a short snippet only) so it's a fraction of the tokens of
  // the full smart filter. PREFILTER_BATCH_LIMIT caps how many jobs one run
  // triages (0 = unlimited). A "reject" here becomes the job's latest verdict and
  // drops it from the expensive smart-filter pool automatically.
  PREFILTER_BATCH_LIMIT: z.coerce.number().int().min(0).default(100),
  PREFILTER_BATCH_SIZE: z.coerce.number().int().min(1).max(50).default(15),

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

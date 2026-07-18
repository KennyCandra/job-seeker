"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = exports.envSchema = void 0;
require("dotenv/config");
const zod_1 = require("zod");
exports.envSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(["development", "production", "test"]).default("development"),
    PORT: zod_1.z.coerce.number().int().positive().default(3000),
    DATABASE_URL: zod_1.z
        .string()
        .default("postgres://cv_autopilot:cv_autopilot@localhost:5432/cv_autopilot"),
    DATABASE_POOL_SIZE: zod_1.z.coerce.number().int().positive().default(10),
    REDIS_URL: zod_1.z.string().default("redis://localhost:6379"),
    TASK_QUEUE_NAME: zod_1.z.string().default("cv-autopilot-tasks-v2"),
    APPLY_QUEUE_NAME: zod_1.z.string().default("cv-autopilot-apply-v2"),
    WORKER_CONCURRENCY: zod_1.z.coerce.number().int().min(1).default(3),
    ENABLE_WORKER: zod_1.z
        .string()
        .default("false")
        .transform((v) => v === "true"),
    APPLY_WORKER: zod_1.z
        .string()
        .default("false")
        .transform((v) => v === "true"),
    POLL_INTERVAL_HOURS: zod_1.z.coerce.number().nullish().default(null),
    DISCOVERY_INTERVAL_HOURS: zod_1.z.coerce.number().nullish().default(null),
    DISCOVERY_PROVIDER: zod_1.z.enum(["serpapi", "playwright"]).default("serpapi"),
    SERPAPI_KEY: zod_1.z.string().optional(),
    SERP_API_KEY: zod_1.z.string().optional(),
    LLM_PROVIDER: zod_1.z.enum(["opencode", "anthropic", "openai"]).default("opencode"),
    LLM_MODEL: zod_1.z.string().optional(),
    LLM_API_KEY: zod_1.z.string().optional(),
    LLM_BASE_URL: zod_1.z.string().optional(),
    OPENCODE_BASE_URL: zod_1.z.string().default("http://127.0.0.1:4096"),
    OPENCODE_MODEL: zod_1.z.string().optional(),
    OPENCODE_PROVIDER_ID: zod_1.z.string().optional(),
    OPENCODE_TIMEOUT_MS: zod_1.z.coerce.number().default(180000),
    ADMIN_API_TOKEN: zod_1.z.string().optional(),
    ENABLE_QUEUE_ADMIN: zod_1.z
        .string()
        .default("false")
        .transform((v) => v === "true"),
    APPLY_KEEP_BROWSER_ON_BLOCK: zod_1.z
        .string()
        .default("false")
        .transform((v) => v === "true"),
    DATA_DIR: zod_1.z.string().optional(),
    SKILLS_DIR: zod_1.z.string().optional(),
    FRONTEND_DIST: zod_1.z.string().optional(),
    TEMPLATES_DIR: zod_1.z.string().optional(),
});
exports.env = exports.envSchema.parse(process.env);
//# sourceMappingURL=env.js.map
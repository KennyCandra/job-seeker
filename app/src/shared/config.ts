import { readFileSync, existsSync } from "fs";
import { join } from "path";
import type { SearchConfig, LlmConfig, LlmProvider } from "./types";

const APP_ROOT = join(import.meta.dir, "..", "..", "..");
const CONFIG_PATH = join(APP_ROOT, "data", "search_config.json");

export function loadSearchConfig(): SearchConfig {
  if (existsSync(CONFIG_PATH)) {
    const raw = readFileSync(CONFIG_PATH, "utf-8");
    return JSON.parse(raw) as SearchConfig;
  }
  return {
    roles: ["backend engineer", "fullstack engineer", "software engineer"],
    location: ["EMEA", "worldwide", "global", "remote"],
    exclude: ["principal", "staff", "architect", "intern"],
    ats: ["greenhouse", "lever", "ashby"],
    min_score: 65,
    discovery_interval_hours: 48,
  };
}

export function loadLlmConfig(): LlmConfig {
  const provider = (process.env.LLM_PROVIDER || "opencode") as LlmProvider;
  return {
    provider,
    model: process.env.LLM_MODEL || process.env.OPENCODE_MODEL || undefined,
    apiKey: process.env.LLM_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || undefined,
    baseUrl: process.env.LLM_BASE_URL || process.env.OPENCODE_BASE_URL || "http://127.0.0.1:4096",
    timeoutMs: Number(process.env.LLM_TIMEOUT_MS || process.env.OPENCODE_TIMEOUT_MS || 180000),
  };
}

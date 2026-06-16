import type { SearchConfig, LlmConfig, LlmProvider } from "./types";
import { searchConfig } from "../db";

const CONFIG_KEY = "search_config";

export async function loadSearchConfig(): Promise<SearchConfig> {
  const raw = await searchConfig.instance.getJson<SearchConfig | null>(CONFIG_KEY, null);
  if (raw) return raw;
  return {
    roles: ["fullstack engineer", "software engineer", "fullstack developer", "software developer"],
    location: ["EMEA", "worldwide", "global", "remote"],
    exclude: ["principal", "staff", "architect", "intern"],
    ats: ["greenhouse", "lever", "ashby"],
    min_score: 65,
    discovery_interval_hours: 48,
    targetCompanies: [],
  };
}

export async function saveSearchConfig(config: SearchConfig): Promise<void> {
  await searchConfig.instance.setJson(CONFIG_KEY, config);
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

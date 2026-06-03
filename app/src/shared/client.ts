import { join } from "path";
import { OpenCodeClient } from "./llm";
import { DATA_DIR } from "./paths";

export function createClient(): OpenCodeClient {
  const baseUrl = process.env.OPENCODE_BASE_URL || undefined;
  const model = process.env.OPENCODE_MODEL || undefined;
  const providerId = process.env.OPENCODE_PROVIDER_ID || undefined;
  const timeoutMs = process.env.OPENCODE_TIMEOUT_MS ? Number(process.env.OPENCODE_TIMEOUT_MS) : undefined;
  const debugDir = process.env.OPENCODE_DEBUG_DIR || join(DATA_DIR, "debug");
  return new OpenCodeClient({ baseUrl, model, providerId, timeoutMs, debugDir });
}

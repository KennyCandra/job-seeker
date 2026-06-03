import { createClient } from "../shared/client";
import { parseJsonFromText } from "../shared/llm";
import { buildIntentPrompt } from "./prompts/intent";
import type { AgentSkill, SkillResult, SessionState } from "./types";

export type IntentResult = { skill: string; args: Record<string, unknown> };

export async function handleIntent(
  text: string,
  session: SessionState,
  skills: Record<string, AgentSkill>,
): Promise<IntentResult | SkillResult> {
  const ctxStr = [
    session.current_job ? `Current job: ${session.current_job.title} at ${session.current_job.company}` : "No job selected.",
    `Recent jobs: ${session.recent_jobs.length}`,
    session.last_search_results?.length ? `Last search: ${session.last_search_results.length} results.` : "",
  ].filter(Boolean).join("\n");

  const client = createClient();
  const prompt = buildIntentPrompt(ctxStr, text, skills);

  let raw: string;
  try {
    raw = await client.completeJson(prompt.system, prompt.user);
  } catch (err: any) {
    return { type: "error", message: `LLM call failed: ${err.message}` };
  }

  try {
    const parsed = parseJsonFromText<{ function: string; arguments: Record<string, unknown> }>(raw);
    return { skill: parsed.function, args: parsed.arguments || {} };
  } catch {
    return { skill: "chat", args: {} };
  }
}

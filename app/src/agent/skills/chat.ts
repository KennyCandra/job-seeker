import { createClient } from "../../shared/client";
import type { AgentSkill } from "../types";

export const chat: AgentSkill = {
  name: "chat",
  description: "General conversation, greeting, small talk, or unclear intent",
  params: {},
  chat: true,
  execute: async (_args, _session, fullText) => {
    const client = createClient();
    try {
      const r = await client.completeJson("You are a helpful job hunting assistant. Be concise. Suggest skills if relevant.", fullText as string);
      return { type: "text", text: r };
    } catch {
      return { type: "text", text: "Hi! I can search jobs, generate CVs, scrape URLs, and more." };
    }
  },
};

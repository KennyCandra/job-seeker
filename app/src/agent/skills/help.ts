import type { AgentSkill } from "../types";

export const help: AgentSkill = {
  name: "help",
  description: "List available skills and how to use the bot",
  params: {},
  execute: async () => {
    return { type: "text", text: "I can help with job search, CV generation, cover letters, and more.\n\nTry: search jobs, generate CV, write cover letter, extract job from text, etc." };
  },
};

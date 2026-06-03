import { extractJobFromText } from "../../shared/documents";
import type { FilterResult } from "../../shared/types";
import type { AgentSkill } from "../types";

export const extractJob: AgentSkill = {
  name: "extract_job",
  description: "Extract and save job details from pasted text",
  params: {},
  execute: async (_args, session, fullText) => {
    try {
      const job = await extractJobFromText(fullText as string);
      const filter: FilterResult = { verdict: "accept", score: 100, reasons: ["Pasted"], must_have_hits: [], missing: [] };
      session.recent_jobs = [{ job, filter }];
      session.current_job = job;
      return { type: "text", text: `📋 Saved: **${job.company}** — ${job.title}\n📍 ${job.location}\n\nWhat now? CV, cover letter, etc.` };
    } catch {
      return { type: "error", message: "Couldn't parse that as a job. Try again?" };
    }
  },
};

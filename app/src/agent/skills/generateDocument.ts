import { join } from "path";
import { existsSync, readFileSync } from "fs";
import { jobDir } from "../../shared/paths";
import { generateDocument as generateDoc } from "../../shared/documents";
import type { JobRecord, TailoredResumeContent } from "../../shared/types";
import type { AgentSkill } from "../types";

async function loadResume(job: JobRecord): Promise<TailoredResumeContent | null> {
  const dir = jobDir(job);
  const p = join(dir, "resume.json");
  if (existsSync(p)) return JSON.parse(readFileSync(p, "utf-8"));
  return null;
}

export const generateDocument: AgentSkill = {
  name: "generate_document",
  description: "Generate a cover letter, recommendation letter, or custom document for the current job",
  params: {
    doc_type: { type: "string", description: "Type of document to generate", enum: ["cover_letter", "recommendation", "custom"] },
    custom_instruction: { type: "string", description: "What to write (required for custom doc_type)" },
  },
  required: ["doc_type"],
  execute: async (args, session) => {
    const job = session.current_job;
    if (!job) return { type: "error", message: "No job selected. Generate a CV first." };

    const resume = session.current_resume || (await loadResume(job));
    if (!resume) return { type: "error", message: "No resume found. Generate a CV first." };

    const docType = (args.doc_type as string) || "custom";
    let content: string;

    try {
      if (docType === "recommendation") {
        content = await generateDoc("recommendation", job);
      } else if (docType === "cover_letter") {
        content = await generateDoc("custom", job, "Write a professional cover letter, 150-220 words.");
      } else {
        const instruction = (args.custom_instruction as string) || "Write a professional message.";
        content = await generateDoc("custom", job, instruction);
      }
    } catch (err: any) {
      return { type: "error", message: `Document generation error: ${err.message}` };
    }

    return { type: "text", text: content };
  },
};

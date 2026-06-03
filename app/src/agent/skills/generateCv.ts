import { join } from "path";
import { existsSync, readdirSync } from "fs";
import { extractJobFromText } from "../../shared/documents";
import { makeCvForJob } from "../../generator/index";
import { jobDir, slug } from "../../shared/paths";
import type { AgentSkill } from "../types";

export const generateCv: AgentSkill = {
  name: "generate_cv",
  description: "Generate a tailored CV/resume for a job",
  params: {
    job_description: { type: "string", description: "Job description text (omit if job already in context)" },
  },
  execute: async (args, session, fullText) => {
    let job = session.current_job;
    if (!job && (args.job_description || (fullText as string).length > 200)) {
      try { job = await extractJobFromText(fullText as string); } catch {
        return { type: "error", message: "Couldn't parse a job description. Paste a clear one." };
      }
    }
    if (!job) {
      if (session.recent_jobs.length === 1) job = session.recent_jobs[0].job;
      else if (session.recent_jobs.length > 1) {
        const lines = ["Which job?", ...session.recent_jobs.map((r, i) => `${i + 1}. ${r.job.company} — ${r.job.title}`)];
        return { type: "text", text: lines.join("\n") };
      } else return { type: "error", message: "Paste a job description first." };
    }

    try {
      const resume = await makeCvForJob(job, 100);
      session.current_job = job;
      session.current_resume = resume;
      if (!session.recent_jobs.some((r) => r.job.id === job.id))
        session.recent_jobs.push({ job, filter: { verdict: "accept", score: 100, reasons: [], must_have_hits: [], missing: [] } });

      const dir = jobDir(job);
      const pdfFiles = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith(".pdf")) : [];
      if (pdfFiles.length > 0) {
        return { type: "file", path: join(dir, pdfFiles[0]), filename: `${slug(job.company)}-${slug(job.title)}.pdf` };
      }
      return { type: "text", text: "✅ CV generated." };
    } catch (err: any) {
      return { type: "error", message: `CV generation error: ${err.message}` };
    }
  },
};

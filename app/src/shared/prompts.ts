import type { JobRecord, TailoredResumeContent } from "./types.ts";

const EXTRACT_SYSTEM = `Extract job posting details from the text. Return raw JSON only — no markdown, no backticks, no commentary. Fields:
- title: job title
- company: company name
- location: job location
- description: full job description (cleaned, max 2000 chars)
- url: any link found (empty string if none)

If you can't determine a field, use empty string. Return JSON only.`;

export function buildExtractPrompt(text: string) {
  return { system: EXTRACT_SYSTEM, user: text };
}

export function buildFilterPrompt(
  job: JobRecord,
  filterMd: string,
  targetCompanies?: string[],
) {
  const targetHint = targetCompanies?.length
    ? `\n\nTarget companies (prioritize these): ${targetCompanies.join(", ")}`
    : "";
  return {
    system: filterMd,
    user: `Evaluate this job and return JSON only. No markdown, no commentary.\n\nTitle: ${job.title}\nCompany: ${job.company}\nLocation: ${job.location}\nSite: ${job.site}\nURL: ${job.url}\nDescription:\n${job.description}${targetHint}`,
  };
}

export function buildResumePrompt(job: JobRecord, cvInstrctions: string , cvMd: string) {
  return {
    system: cvInstrctions,
      user: `Create a tailored resume JSON for this job.
      Make Sure the CV can pass the ATS Return JSON only.
      No markdown, no commentary.
      Job Title: ${job.title}\nCompany: ${job.company}\nLocation: ${job.location}\nDescription:\n${job.description}
      here is the data of the user ${cvMd}`,
  };
}

export function buildApplicationPrompt(
  job: JobRecord,
  resume: TailoredResumeContent,
  appMd: string,
) {
  return {
    system: appMd,
    user: `Create application copy based on the resume and job description. Return JSON only. No markdown, no commentary.\n\nJob Title: ${job.title}\nCompany: ${job.company}\nLocation: ${job.location}\nDescription:\n${job.description}`,
  };
}

export function buildDocumentPrompt(
  docType: string,
  job: JobRecord,
  docsMd: string,
  customInstruction?: string,
) {
  const typeLabel =
    docType === "recommendation" ? "recommendation letter" : "custom message";
  const extra = customInstruction
    ? `\n\nCustom request: ${customInstruction}`
    : "";
  return {
    system: docsMd,
    user: `Create a ${typeLabel} for this job application. Return JSON only. No markdown, no commentary.\n\nJob Title: ${job.title}\nCompany: ${job.company}\nDescription:\n${job.description}${extra}`,
  };
}

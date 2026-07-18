import { join } from "path";
import { readText } from "./utils";
import { SKILLS_DIR } from "../common/paths";
import type { JobRecord, TailoredResumeContent, ApplicationPayload } from "./types";

function readSkill(name: string): string {
  try {
    return readText(join(SKILLS_DIR, name));
  } catch {
    return "";
  }
}

export function buildFilterPrompt(
  job: JobRecord,
  filterMd: string,
  targetCompanies?: string[],
): { system: string; user: string } {
  const system = filterMd || "You are a strict job filter. Return JSON only.";
  const targetLine = targetCompanies?.length
    ? `\nPriority target companies: ${targetCompanies.join(", ")}.`
    : "";
  const user = [
    `Evaluate the following job and return ONLY JSON.`,
    ``,
    `Job title: ${job.title}`,
    `Company: ${job.company}`,
    `Location: ${job.location}`,
    `URL: ${job.url}`,
    ``,
    `Description:`,
    job.description.slice(0, 6000),
    targetLine,
    ``,
    `Respond with JSON only: { "verdict": "accept"|"reject", "score": 0-100, "reasons": [string], "must_have_hits": [string], "missing": [string] }`,
  ].join("\n");
  return { system, user };
}

export function buildResumePrompt(
  job: JobRecord,
  cvInstructions: string,
  profileMd: string,
): { system: string; user: string } {
  const system =
    cvInstructions ||
    "Return JSON only. Select and rewrite dynamic resume sections (skills, experience, projects) for the job.";
  const user = [
    `Job:`,
    `Title: ${job.title}`,
    `Company: ${job.company}`,
    `Location: ${job.location}`,
    `Description: ${job.description.slice(0, 4000)}`,
    ``,
    `Candidate profile:`,
    profileMd,
  ].join("\n");
  return { system, user };
}

export function buildApplicationPrompt(
  job: JobRecord,
  resume: TailoredResumeContent,
  appPrefs: string,
): { system: string; user: string } {
  const system =
    appPrefs ||
    "You prepare application text for a job based on the resume and job description. Return JSON only.";
  const user = [
    `Job: ${job.title} at ${job.company}`,
    `Location: ${job.location}`,
    `Description: ${job.description.slice(0, 3000)}`,
    ``,
    `Resume:`,
    JSON.stringify(resume).slice(0, 4000),
  ].join("\n");
  return { system, user };
}

export function buildDocumentPrompt(
  docType: "recommendation" | "custom",
  job: JobRecord,
  docsContext: string,
  customInstruction?: string,
): { system: string; user: string } {
  const system = docsContext || "Generate the requested application document. Return JSON only.";
  const user = customInstruction
    ? customInstruction
    : [
        `Document type: ${docType}`,
        `Job: ${job.title} at ${job.company}`,
        `Location: ${job.location}`,
        `Description: ${job.description.slice(0, 3000)}`,
      ].join("\n");
  return { system, user };
}

export function getNormalFilterPrompt(
  job: JobRecord,
  userAnswers: { question: string; answer: string }[],
): { system: string; user: string } {
  const system =
    "You are an expert technical recruiter. Evaluate how well a job matches a candidate. " +
    "Return ONLY valid JSON with no markdown: " +
    '{ "category": "strong"|"good"|"weak"|"no-fit", "score": number 0-100, "recommendation": "apply"|"consider"|"skip", "reason": string }';
  const userAnswersText = userAnswers.length
    ? userAnswers.map((a) => `- ${a.question}: ${a.answer}`).join("\n")
    : "(no candidate profile answers provided)";
  const user = [
    `Job:`,
    `Title: ${job.title}`,
    `Company: ${job.company}`,
    `Location: ${job.location}`,
    `Description: ${job.description.slice(0, 6000)}`,
    ``,
    `Candidate profile answers:`,
    userAnswersText,
  ].join("\n");
  return { system, user };
}

export function getSmartFilterPrompt(
  job: JobRecord,
  userAnswers: { question: string; answer: string }[],
): { system: string; user: string } {
  const system =
    "You are a senior hiring-manager reviewer performing a final fit pass on jobs already accepted by a basic filter. " +
    "Return ONLY valid JSON with no markdown: " +
    '{ "category": "strong"|"good"|"weak"|"no-fit", "score": number 0-100, "recommendation": "apply"|"consider"|"skip", "reason": string }';
  const userAnswersText = userAnswers.length
    ? userAnswers.map((a) => `- ${a.question}: ${a.answer}`).join("\n")
    : "(no candidate profile answers provided)";
  const user = [
    `Job:`,
    `Title: ${job.title}`,
    `Company: ${job.company}`,
    `Location: ${job.location}`,
    `Description: ${job.description.slice(0, 6000)}`,
    ``,
    `Candidate profile answers:`,
    userAnswersText,
  ].join("\n");
  return { system, user };
}

export function buildExtractPrompt(text: string): { system: string; user: string } {
  const system =
    "Extract a job posting from the pasted text. Return JSON only with shape: " +
    '{ "title": string, "company": string, "location": string, "url": string, "description": string }';
  const user = text.slice(0, 6000);
  return { system, user };
}

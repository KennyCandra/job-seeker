import { join } from "path";
import { mkdirSync } from "fs";
import { OpenCodeClient, parseJsonFromText } from "./opencode.ts";
import type { JobRecord, FilterResult, ResumePayload, ApplicationPayload, FilteredJob } from "./types.ts";
import { readText, writeJson, writeText } from "./utils.ts";
import { generateResume } from "./latex.ts";
import { safeParseFilter, resumeSchema, applicationSchema } from "./schemas/index.ts";
import { buildFilterPrompt, buildResumePrompt, buildApplicationPrompt, buildDocumentPrompt, buildExtractPrompt } from "./prompts.ts";
import { isJobSeen, markJobSeen, saveAcceptedJob } from "./db.ts";
import { fetchViaJobSpy } from "./jobspy.ts";

export const APP_ROOT = join(import.meta.dir, "..");
export const DATA_DIR = join(APP_ROOT, "data");
export const OUTPUT_DIR = join(APP_ROOT, "output");
export const SKILLS_DIR = join(APP_ROOT, "skills");
export const JOBS_DIR = join(DATA_DIR, "jobs");

const FILTER_MD = join(SKILLS_DIR, "job_filter.md");
const CV_MD = join(SKILLS_DIR, "cv_profile.md");
const APP_MD = join(SKILLS_DIR, "application_prefs.md");

export function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function createClient(): OpenCodeClient {
  const baseUrl = process.env.OPENCODE_BASE_URL || undefined;
  const model = process.env.OPENCODE_MODEL || undefined;
  const providerId = process.env.OPENCODE_PROVIDER_ID || undefined;
  const timeoutMs = process.env.OPENCODE_TIMEOUT_MS ? Number(process.env.OPENCODE_TIMEOUT_MS) : undefined;
  const debugDir = process.env.OPENCODE_DEBUG_DIR || join(DATA_DIR, "debug");
  return new OpenCodeClient({ baseUrl, model, providerId, timeoutMs, debugDir });
}

export function getPersonalData() {
  return {
    name: process.env.PERSONAL_NAME || "Ahmed Abdelrahman",
    email: process.env.PERSONAL_EMAIL || "ahmedabdelrhaman232@gmail.com",
    phone: process.env.PERSONAL_PHONE || "+201024180920",
    location: process.env.PERSONAL_LOCATION || "Cairo, Egypt (UTC+3)",
    linkedin: process.env.PERSONAL_LINKEDIN || "https://linkedin.com/in/ahmed-abdelrahman",
    portfolio: process.env.PERSONAL_PORTFOLIO || "https://kennycandra.dev",
  };
}

export async function extractJobFromText(text: string): Promise<JobRecord> {
  const client = createClient();
  const prompt = buildExtractPrompt(text);
  const result = await client.completeJson(prompt.system, prompt.user);
  const data = parseJsonFromText<Record<string, string>>(result);
  return {
    id: `manual-${Date.now()}`,
    site: "manual",
    title: data.title || "Unknown Position",
    company: data.company || "Unknown Company",
    location: data.location || "Unknown",
    url: data.url || "",
    description: (data.description || text).slice(0, 2000),
    posted_at: new Date().toISOString(),
  };
}

export async function fetchJobs(params: {
  search?: string;
  location?: string;
  num?: string;
  hours?: string;
  sites?: string[];
}): Promise<JobRecord[]> {
  const search = params.search || "software engineer";
  const location = params.location || "Remote";
  const num = params.num || "25";
  const hours = params.hours || "72";
  const sites = params.sites;

  const allJobs = await fetchViaJobSpy({ search, location, num, hours, sites });
  const newJobs = allJobs.filter((j) => !isJobSeen(j.title, j.company));
  allJobs.forEach((j) => markJobSeen(j.title, j.company));
  console.log(`Fetched ${allJobs.length} jobs, ${newJobs.length} new`);
  const nonUsJobs = newJobs.filter((j) => !isUsLocation(j.location));
  console.log(`${newJobs.length - nonUsJobs.length} US jobs skipped before AI filter`);
  return nonUsJobs;
}

function isUsLocation(loc: string): boolean {
  const l = loc.toLowerCase();
  const indicators = [
    /\busa\b/, /\bu\.s\.a\.?\b/, /\bu\.s\.\b/, /\bunited states\b/,
    /,\s*us$/,
    /\bunited kingdom\b/, /\b(england|scotland|wales|northern ireland|ireland)\b/,
    /,\s*uk$/, /\b(uk)\b/,
    /\bindia\b/, /\bbengaluru\b/, /\bmumbai\b/, /\bnew delhi\b/, /\bhyderabad\b/, /\bpune\b/, /\bchennai\b/, /\bkolkata\b/, /\bahmedabad\b/, /\bjaipur\b/, /\bsurat\b/, /\blucknow\b/, /\bkanpur\b/, /\bnagpur\b/, /\bindore\b/, /\bbhopal\b/, /\bvisakhapatnam\b/, /\bpatna\b/, /\bvadodara\b/, /\bghaziabad\b/, /\bludhiana\b/, /\bagra\b/, /\bnashik\b/, /\branchi\b/, /\bfaridabad\b/, /\bmeerut\b/, /\brajkot\b/, /\bvaranasi\b/, /\bsrinagar\b/, /\baurangabad\b/, /\bdhanbad\b/, /\bamritsar\b/, /\bnavi mumbai\b/, /\ballahabad\b/, /\bhowrah\b/, /\bgwalior\b/, /\bjabalpur\b/, /\bcoimbatore\b/, /\bvijayawada\b/, /\bjodhpur\b/, /\bmadurai\b/, /\braipur\b/, /\bkota\b/, /\bchandigarh\b/, /\bthiruvananthapuram\b/, /\bguwahati\b/, /\bsalem\b/, /\btrichy\b/, /\bbhubaneswar\b/, /\bkochi\b/, /\bmysore\b/, /\bmangalore\b/, /\bgurgaon\b/, /\bno\.\s*?ida\b/, /\bdelhi\b/, /\bnoida\b/, /\bgurugram\b/,
    /\bharyana\b/, /\bkarnataka\b/, /\btamil nadu\b/, /\bmaharashtra\b/, /\bgujarat\b/, /\brajasthan\b/, /\bpunjab\b/, /\bwest bengal\b/, /\budhayanagar\b/,
    /\b(ca|tx|ny|fl|il|wa|ma|pa|oh|ga|nc|mi|nj|va|az|co|mn|mo|md|wi|in|tn|al|or|ky|ok|sc|ut|ia|nv|ar|ms|ks|la|ct|ne|nm|id|nh|me|mt|ri|de|sd|ak|hi|vt|wv|wy|nd)\b/,
    /\b(london|oxford|cambridge|manchester|liverpool|birmingham|edinburgh|glasgow|bristol|cardiff|belfast|sheffield|leeds|nottingham|leicester|southampton|portsmouth|brighton|aberdeen|dundee)\b/,
    /\b(san francisco|new york|los angeles|chicago|houston|phoenix|philadelphia|san antonio|san diego|dallas|austin|seattle|boston|denver|atlanta|portland|detroit|memphis|nashville|baltimore|miami|minneapolis|tampa|orlando|charlotte|sacramento|kansas city|columbus|indianapolis|cleveland|cincinnati|milwaukee|raleigh|pittsburgh|salt lake city|reno|las vegas)\b/,
  ];
  return indicators.some((re) => re.test(l));
}

export async function filterJobs(client: OpenCodeClient, jobs: JobRecord[]): Promise<FilteredJob[]> {
  const filterMd = readText(FILTER_MD);
  const results: FilteredJob[] = [];

  for (const [index, job] of jobs.entries()) {
    console.log(`Filtering job ${index + 1}/${jobs.length}: ${job.company} - ${job.title}`);
    const prompt = buildFilterPrompt(job, filterMd);
    const filter = await client.filterJob(prompt.system, prompt.user);
    const parsed = safeParseFilter(filter);

    if (!parsed.success) {
      const debugPath = join(DATA_DIR, "debug", `filter-${slug(job.company)}-${slug(job.title)}.json`);
      writeJson(debugPath, { job, raw: filter, issues: parsed.error.issues });
      console.warn(`Filter parse failed for ${job.company} - ${job.title}, skipping`);
      continue;
    }
    results.push({ job, filter: parsed.data });
  }
  return results;
}

export async function generateResumeForJob(client: OpenCodeClient, job: JobRecord): Promise<ResumePayload> {
  const cvMd = readText(CV_MD);
  const personal = getPersonalData();
  console.log(`Generating resume for ${job.company} - ${job.title}...`);
  const prompt = buildResumePrompt(job, cvMd, personal);
  const resume = await client.createResume(prompt.system, prompt.user);
  const normalized = normalizeResumePayload(resume);

  // Override personal data with env-provided values
  normalized.name = personal.name;
  normalized.email = personal.email;
  normalized.phone = personal.phone;
  normalized.location = personal.location;
  normalized.linkedin = personal.linkedin;
  normalized.portfolio = personal.portfolio || normalized.portfolio;

  const parsed = resumeSchema.safeParse(normalized);

  if (!parsed.success) {
    const debugPath = join(DATA_DIR, "debug", `resume-${slug(job.company)}-${slug(job.title)}.json`);
    writeJson(debugPath, { job, raw: resume, normalized, issues: parsed.error.issues });
    throw new Error(`Resume schema mismatch for ${job.company}. See ${debugPath}`);
  }
  return parsed.data;
}

export async function generateApplicationForJob(
  client: OpenCodeClient,
  job: JobRecord,
  resume: ResumePayload,
): Promise<ApplicationPayload> {
  const appMd = readText(APP_MD);
  console.log("Generating application copy...");
  const prompt = buildApplicationPrompt(job, resume, appMd);
  const application = await client.createApplication(prompt.system, prompt.user);
  return applicationSchema.parse(application);
}

export async function buildResumePdf(job: JobRecord, resume: ResumePayload): Promise<string> {
  const jobDir = join(JOBS_DIR, slug(job.company));
  mkdirSync(jobDir, { recursive: true });

  const resumePath = join(jobDir, "resume.json");
  writeJson(resumePath, resume);

  const pdfPath = join(jobDir, `${slug(resume.name)}.pdf`);
  await generateResume(resumePath, pdfPath);
  return pdfPath;
}

export function jobDir(job: JobRecord): string {
  return join(JOBS_DIR, slug(job.company));
}

export function renderApplicationMarkdown(job: JobRecord, resume: ResumePayload, application: ApplicationPayload): string {
  return [
    "# Application Package",
    "",
    "## Job",
    `- Title: ${job.title}`,
    `- Company: ${job.company}`,
    `- Location: ${job.location}`,
    `- URL: ${job.url}`,
    "",
    "## Cover Letter",
    application.cover_letter,
    "",
    "## Email",
    `Subject: ${application.email_subject}`,
    "",
    application.email_body,
  ].join("\n");
}

export async function makeCvForJob(job: JobRecord, result: FilterResult): Promise<void> {
  const client = createClient();
  const dir = jobDir(job);
  mkdirSync(dir, { recursive: true });

  const resume = await generateResumeForJob(client, job);
  writeJson(join(dir, "resume.json"), resume);

  const pdfPath = await buildResumePdf(job, resume);
  console.log(`PDF saved: ${pdfPath}`);

  saveAcceptedJob(job.id, job.company, job.title, job.location, job.site, job.url, result.score);

  const app = await generateApplicationForJob(client, job, resume);
  writeJson(join(dir, "application.json"), app);

  const md = renderApplicationMarkdown(job, resume, app);
  writeText(join(dir, "application.md"), md);
}

export async function generateDocument(
  docType: "recommendation" | "custom",
  job: JobRecord,
  resume: ResumePayload,
  customInstruction?: string,
): Promise<string> {
  const docsMd = readText(join(SKILLS_DIR, "documents.md"));
  const client = createClient();
  const prompt = buildDocumentPrompt(docType, job, resume, docsMd, customInstruction);
  const result = await client.completeJson(prompt.system, prompt.user);
  const parsed = parseJsonFromText<Record<string, string>>(result);
  return parsed.content || result;
}

function normalizeSkillsUsed(item: any) {
  if (Array.isArray(item.skillsUsed)) return item.skillsUsed.join(", ");
  if (Array.isArray(item.skills_used)) return item.skills_used.join(", ");
  return item.skillsUsed || item.skills_used;
}

export function normalizeResumePayload(raw: any): ResumePayload {
  const candidate = raw.candidate || raw.contact || raw.personal_info || {};
  const educationArray = Array.isArray(raw.education) ? raw.education : raw.education ? [raw.education] : [];
  const experienceArray = Array.isArray(raw.experience) ? raw.experience : raw.experience ? [raw.experience] : Array.isArray(raw.work) ? raw.work : raw.work ? [raw.work] : [];
  const projectsArray = Array.isArray(raw.projects) ? raw.projects : raw.projects ? [raw.projects] : [];

  const skillsArray = (() => {
    if (!Array.isArray(raw.skills)) {
      if (raw.skills && typeof raw.skills === "object") {
        return Object.entries(raw.skills).map(([category, items]) => ({
          category,
          items: Array.isArray(items) ? items : [String(items)],
        }));
      }
      return [];
    }
    const first = raw.skills[0] || {};
    if ("keywords" in first) {
      return raw.skills.map((s: any) => ({ category: s.name || s.category || "", items: s.keywords }));
    }
    return raw.skills;
  })();

  const basics = raw.basics || raw.personal || raw.personalInfo || raw.contact || raw.personal_info || {};
  const basicsUrls = basics.urls || {};

  return {
    name: raw.name || basics.name || candidate.name || "",
    email: raw.email || basics.email || candidate.email || "",
    phone: raw.phone || basics.phone || candidate.phone || "",
    location: raw.location || basics.location || candidate.location || "",
    linkedin: raw.linkedin || basics.linkedin || basicsUrls.linkedin || candidate.linkedin || "",
    portfolio: raw.portfolio || basics.portfolio || basicsUrls.portfolio || candidate.portfolio,
    experience: experienceArray.map((item: any) => ({
      title: item.title || item.position || item.role || "",
      company: item.company || item.name || "",
      dates: item.dates || [item.start_date || item.startDate, item.end_date || item.endDate].filter(Boolean).join(" - ") || "",
      bullets: Array.isArray(item.bullets) ? item.bullets : Array.isArray(item.highlights) ? item.highlights : item.bullets ? [String(item.bullets)] : [],
    })),
    skills: skillsArray,
    education: educationArray.map((item: any) => ({
      degree: item.degree || item.area || "",
      school: item.school || item.institution || "",
      year: String(item.year || item.endDate || ""),
    })),
    projects: projectsArray.map((item: any) => ({
      name: item.name || "",
      link: item.link || item.url,
      description: item.description,
      techStack: Array.isArray(item.tech) ? item.tech.join(", ") : Array.isArray(item.skills) ? item.skills.join(", ") : item.tech,
      highlights: Array.isArray(item.highlights) ? item.highlights : item.bullets,
      skillsUsed: normalizeSkillsUsed(item),
    })),
  };
}

import latex from "node-latex";
import { mkdirSync, createWriteStream, writeFileSync, existsSync, readFileSync } from "fs";
import { dirname, join } from "path";

const APP_ROOT = join(import.meta.dir, "..");
const TEMPLATE_PATH = join(APP_ROOT, "templates", "resume.tex");

const fallbackTemplate = `
\\documentclass[11pt]{article}
\\usepackage[T1]{fontenc}
\\usepackage[utf8]{inputenc}
\\usepackage[margin=0.7in]{geometry}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{titlesec}
\\usepackage{xcolor}
\\usepackage{tabularx}

\\definecolor{sectionblue}{HTML}{1F6FB2}
\\titleformat{\\section}{\\large\\bfseries\\color{sectionblue}}{}{0em}{}[\\titlerule]
\\titlespacing*{\\section}{0pt}{8pt}{4pt}
\\setlist[itemize]{leftmargin=*, noitemsep, topsep=2pt}

\\begin{document}

\\begin{center}
{\\LARGE \\textbf{ {{{name}}} }} \\\\[4pt]
{{{contact}}}
\\end{center}

\\section{Skills}
{{{skills}}}

\\section{Education}
{{{education}}}

\\section{Work Experience}
{{{experience}}}

{{{projectsSection}}}

\\end{document}
`;

function loadTemplate(): string {
  if (existsSync(TEMPLATE_PATH)) {
    return readFileSync(TEMPLATE_PATH, "utf-8");
  }
  console.warn("[latex] templates/resume.tex not found, using inline fallback");
  return fallbackTemplate;
}

export function sanitizeLatex(text: string): string {
  return text
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/[&%$#_{}]/g, (char) => `\\${char}`)
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

function fillTemplate(data: Record<string, string>) {
  const template = loadTemplate();
  let tex = template;
  for (const [key, value] of Object.entries(data)) {
    tex = tex.replaceAll(`{{{${key}}}}`, value);
  }
  return tex;
}

function linkify(text?: string) {
  if (!text) return "";
  const escaped = text.replace(/&/g, "\\&");
  return `\\href{${escaped}}{${sanitizeLatex(text)}}`;
}

function buildExperienceHeader(job: any) {
  const company = sanitizeLatex(job.company || "");
  const title = sanitizeLatex(job.title || "");
  const dates = sanitizeLatex(job.dates || "");
  const header = dates ? `\\textbf{${company}} \\hfill ${dates}` : `\\textbf{${company}}`;
  return `${header} \\\\\n\\textit{${title}}\\\\`;
}

function buildExperienceBullets(bullets?: string[]) {
  if (!bullets || bullets.length === 0) return "";
  const items = bullets.map((b) => `\\item ${sanitizeLatex(b)}`).join("\n");
  return `\\begin{itemize}\n${items}\n\\end{itemize}`;
}

function buildExperience(jobs: any[]) {
  return jobs
    .map((job) => `${buildExperienceHeader(job)}${buildExperienceBullets(job.bullets)}`)
    .join("\n\n");
}

function buildSkills(skills: any[]) {
  if (!skills.length) return "";
  if (typeof skills[0] === "string") {
    return skills.map((s: string) => `\\textbf{${sanitizeLatex(s)}}`).join(" | ");
  }

  const cells = skills.map((group: { category: string; items: string[] }) => {
    const items = group.items.map((item) => sanitizeLatex(item)).join(", ");
    return `\\textbf{${sanitizeLatex(group.category)}}\\newline ${items}`;
  });

  const columns = 3;
  const lines: string[] = [];
  for (let i = 0; i < cells.length; i += columns) {
    const chunk = cells.slice(i, i + columns);
    while (chunk.length < columns) chunk.push(" ");
    lines.push(chunk.join(" & "));
  }

  return [
    "\\begin{tabularx}{\\textwidth}{X X X}",
    ...lines.map((line) => `${line} \\\\`),
    "\\end{tabularx}",
  ].join("\n");
}

function buildEducation(edu: any[]) {
  return edu
    .map((e) => `\\textbf{${sanitizeLatex(e.degree)}} \\hfill ${sanitizeLatex(e.year)} \\\n${sanitizeLatex(e.school)}`)
    .join("\n\n");
}

function buildProjects(projects?: any[]) {
  if (!projects || projects.length === 0) return "";
  const body = projects
    .map((project) => {
      const title = project.link
        ? `\\textbf{${sanitizeLatex(project.name)}} ${linkify(project.link)}`
        : `\\textbf{${sanitizeLatex(project.name)}}`;
      const lines = [title];
      if (project.description) lines.push(sanitizeLatex(project.description));
      if (project.techStack) lines.push(`\\textit{Tech Stack:} ${sanitizeLatex(project.techStack)}`);
      if (project.skillsUsed) lines.push(`\\textit{Skills Used:} ${sanitizeLatex(project.skillsUsed)}`);
      if (project.highlights?.length) {
        lines.push(
          `\\begin{itemize}\n${project.highlights.map((b: string) => `\\item ${sanitizeLatex(b)}`).join("\n")}\n\\end{itemize}`,
        );
      }
      return lines.join("\\\\\n");
    })
    .join("\n\n");

  return `\\section{Projects}\n${body}`;
}

export async function generateResume(jsonPath: string, outputPath: string) {
  const text = readFileSync(jsonPath, "utf-8");
  const data = JSON.parse(text);

  const contact = [data.location, data.phone, data.email, data.linkedin, data.portfolio]
    .filter(Boolean)
    .map((item: string) => linkify(item))
    .join(" \\textbar{} ");

  const tex = fillTemplate({
    name: sanitizeLatex(data.name),
    contact,
    experience: buildExperience(data.experience),
    skills: buildSkills(data.skills),
    education: buildEducation(data.education),
    projectsSection: buildProjects(data.projects),
  });

  mkdirSync(dirname(outputPath), { recursive: true });

  const texPath = outputPath.replace(/\.pdf$/, ".tex");
  writeFileSync(texPath, tex, "utf-8");

  return new Promise((resolve, reject) => {
    const pdf = latex(tex) as any;
    const stream = pdf.pipe(createWriteStream(outputPath) as any) as any;
    pdf.on("error", (err: any) => {
      console.error("[latex] Compilation error:", err.message);
      reject(err);
    });
    stream.on("finish", () => resolve(outputPath));
    stream.on("error", (err: any) => {
      console.error("[latex] Stream error:", err.message);
      reject(err);
    });
  });
}

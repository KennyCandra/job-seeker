import latex from "node-latex";
import {
  mkdirSync,
  createWriteStream,
  writeFileSync,
  existsSync,
  readFileSync,
} from "fs";
import { dirname, join } from "path";
import type { ProfileData } from "@shared/types";

const APP_ROOT = join(import.meta.dir, "..", "..", "..");
const TEMPLATE_PATH = join(APP_ROOT, "templates", "resume.tex");

const fallbackTemplate = `
\\documentclass[10pt, a4paper]{article}
\\usepackage[T1]{fontenc}
\\usepackage[utf8]{inputenc}
\\usepackage{lmodern}
\\usepackage[margin=0.5in, top=0.4in, bottom=0.4in]{geometry}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{titlesec}
\\usepackage{xcolor}
\\usepackage{tabularx}
\\usepackage{microtype}
\\usepackage{graphicx}
\\newcommand{\\githubIcon}{\\raisebox{-0.28ex}{\\includegraphics[height=1.25em]{\\detokenize{{{{githubIconPath}}}}}}}
\\newcommand{\\linkedinIcon}{\\raisebox{-0.28ex}{\\includegraphics[height=1.25em]{\\detokenize{{{{linkedinIconPath}}}}}}}
\\setlength{\\parskip}{0pt}
\\setlength{\\parindent}{0pt}
\\definecolor{primary}{HTML}{2B3A67}
\\definecolor{accent}{HTML}{3B82F6}
\\definecolor{subtle}{HTML}{6B7280}
\\definecolor{divider}{HTML}{D1D5DB}
\\titleformat{\\section}{\\large\\bfseries\\color{primary}\\scshape}{}{0em}{}[\\color{divider}\\titlerule]
\\titlespacing*{\\section}{0pt}{4pt}{3pt}
\\setlist[itemize]{leftmargin=1.1em, noitemsep, topsep=0pt, partopsep=0pt, parsep=0pt, itemsep=2pt, label=\\textcolor{accent}{\\textbullet}}
\\pagestyle{empty}
\\begin{document}
\\begin{center}
{\\Large\\bfseries\\color{primary} {{{name}}}}\\par\\vspace{2pt}
{\\small\\color{subtle} {{{contact}}}}
\\end{center}
\\vspace{-1pt}
\\section{Technical Skills}
\\vspace{1pt}
{{{skills}}}
\\vspace{1pt}
\\section{Work Experience}
\\vspace{1pt}
{{{experience}}}
{{{projectsSection}}}
{{{education}}}
\\end{document}
`;

function loadTemplate(): string {
  if (existsSync(TEMPLATE_PATH)) {
    return readFileSync(TEMPLATE_PATH, "utf-8");
  }

  return fallbackTemplate;
}

export function sanitizeLatex(text: string): string {
  return text
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/[&%$#_{}]/g, (char) => `\\${char}`)
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}");
}

function boldTech(text: string): string {
  return text.replace(/<<(.+?)>>/g, "\\textbf{$1}");
}

function fillTemplate(data: Record<string, string>) {
  const template = loadTemplate();
  let tex = template;
  for (const [key, value] of Object.entries(data)) {
    tex = tex.replaceAll(`{{{${key}}}}`, value);
  }
  return tex;
}

function latexPath(path: string): string {
  return path.replace(/\\/g, "/");
}

function linkify(text?: string) {
  if (!text) return "";
  const escaped = text.replace(/&/g, "\\&");
  return `\\href{${escaped}}{${sanitizeLatex(text)}}`;
}

function linkifyWithLabel(url: string | undefined, label: string) {
  if (!url) return "";
  const escaped = url.replace(/&/g, "\\&");
  return `\\href{${escaped}}{${label}}`;
}

function buildExperienceHeader(job: any) {
  const company = sanitizeLatex(job.company || "");
  const title = sanitizeLatex(job.title || "");
  const dates = sanitizeLatex(job.dates || "");
  const role = company && title
    ? `\\textbf{${company}} \\textcolor{subtle}{·} \\textit{${title}}`
    : `\\textbf{${company || title}}`;
  const header = dates
    ? `${role} \\hfill {\\small\\textcolor{subtle}{${dates}}}`
    : role;
  return header;
}

function buildExperienceBullets(bullets?: string[]) {
  if (!bullets || bullets.length === 0) return "";
  const items = bullets
    .map((b) => `\\item {\\small ${boldTech(sanitizeLatex(b))}}`)
    .join("\n");
  return `\\vspace{0.5pt}\n\\begin{itemize}\n${items}\n\\end{itemize}`;
}

function buildExperience(jobs: any[]) {
  return jobs
    .map(
      (job) =>
        `${buildExperienceHeader(job)}${buildExperienceBullets(job.bullets)}`,
    )
    .join("\n\\vspace{4pt}\n");
}

function buildSkills(skills: any[]) {
  if (!skills.length) return "";
  if (typeof skills[0] === "string") {
    return skills
      .map((s: string) => `\\textbf{${sanitizeLatex(s)}}`)
      .join(" | ");
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
    ...lines.map((line) => `${line} \\\\[3pt]`),
    "\\end{tabularx}",
  ].join("\n");
}

function buildEducation(edu: any[]) {
  if (!edu || edu.length === 0) return "";
  const body = edu
    .map((e) => {
      const course = sanitizeLatex(e.degree);
      const provider = sanitizeLatex(e.school);
      const year = sanitizeLatex(e.year);
      const label =
        provider && year
          ? `${course} — ${provider} (${year})`
          : provider
            ? `${course} — ${provider}`
            : course;
      return `\\item ${label}`;
    })
    .join("\n");
  return `\\section{Coursework}\n\\begin{itemize}\n${body}\n\\end{itemize}`;
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
      const details = lines.join("\\\\[0.5pt]\n");
      if (project.highlights?.length) {
        const bullets = project.highlights
          .slice(0, 4)
          .map((b: string) => `\\item ${boldTech(sanitizeLatex(b))}`)
          .join("\n");
        return `${details}\n\\vspace{2pt}\n\\begin{itemize}\n${bullets}\n\\end{itemize}`;
      }
      return details;
    })
    .join("\n\\vspace{4pt}\n");

  return `\\section{Projects}\n${body}`;
}

export async function generateResume(
  jsonPath: string,
  profileData: ProfileData,
  outputPath: string,
) {
  console.log("started generating the resume......")
  const text = readFileSync(jsonPath, "utf-8");
  const data = JSON.parse(text);

  const contact = [
    profileData.location,
    profileData.phone,
    profileData.email,
    linkifyWithLabel(profileData.linkedin, "\\linkedinIcon"),
    linkifyWithLabel(profileData.portfolio, "Portfolio"),
    linkifyWithLabel(profileData.github, "\\githubIcon"),
  ]
    .filter((item): item is string => Boolean(item))
    .map((item) => (item.startsWith("\\href{") ? item : linkify(item)))
    .join(" \\;\\textcolor{divider}{\\textbar{}}\\; ");

  const tex = fillTemplate({
    name: sanitizeLatex(profileData.name),
    githubIconPath: latexPath(join(APP_ROOT, "templates", "assets", "github.png")),
    linkedinIconPath: latexPath(join(APP_ROOT, "templates", "assets", "linkedin.png")),
    contact,
    experience: buildExperience(data.experience),
    skills: buildSkills(data.skills),
    education: buildEducation(profileData.education),
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

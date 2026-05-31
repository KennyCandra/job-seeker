import latex from "node-latex";
import { mkdirSync, createWriteStream, writeFileSync } from "fs";
import { dirname } from "path";
import { readText } from "./utils";

const resumeTemplate = `
\\documentclass[11pt]{article}
\\usepackage[T1]{fontenc}
\\usepackage[utf8]{inputenc}
\\usepackage[margin=0.7in]{geometry}
\\usepackage{enumitem}
\\usepackage{hyperref}
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

function fillTemplate(data: Record<string, string>) {
  let tex = resumeTemplate;
  for (const [key, value] of Object.entries(data)) {
    tex = tex.replaceAll(`{{{${key}}}}`, value);
  }
  return tex;
}

function escapeLatex(input: string) {
  const out: string[] = [];
  for (const ch of input) {
    switch (ch) {
      case "\\": out.push("\\textbackslash{}"); break;
      case "&":  out.push("\\&"); break;
      case "%":  out.push("\\%"); break;
      case "$":  out.push("\\$"); break;
      case "#":  out.push("\\#"); break;
      case "_":  out.push("\\_"); break;
      case "{":  out.push("\\{"); break;
      case "}":  out.push("\\}"); break;
      case "~":  out.push("\\textasciitilde{}"); break;
      case "^":  out.push("\\textasciicircum{}"); break;
      default:   out.push(ch);
    }
  }
  return out.join("");
}

function escapeUrl(input: string) {
  return input.replace(/&/g, "\\&");
}

function linkify(text?: string) {
  if (!text) return "";
  return `\\href{${escapeUrl(text)}}{${escapeLatex(text)}}`;
}

function buildExperienceHeader(job: any) {
  const company = escapeLatex(job.company || "");
  const title = escapeLatex(job.title || "");
  const dates = escapeLatex(job.dates || "");
  const header = dates ? `\\textbf{${company}} \\hfill ${dates}` : `\\textbf{${company}}`;
  return `${header} \\\\\n\\textit{${title}}\\\\`;
}

function buildExperienceBullets(bullets?: string[]) {
  if (!bullets || bullets.length === 0) return "";
  const items = bullets.map((b) => `\\item ${escapeLatex(b)}`).join("\n");
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
    return skills.map((s: string) => `\\textbf{${escapeLatex(s)}}`).join(" | ");
  }

  const cells = skills.map((group: { category: string; items: string[] }) => {
    const items = group.items.map((item) => escapeLatex(item)).join(", ");
    return `\\textbf{${escapeLatex(group.category)}}\\newline ${items}`;
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
    .map((e) => `\\textbf{${escapeLatex(e.degree)}} \\hfill ${escapeLatex(e.year)} \\\n${escapeLatex(e.school)}`)
    .join("\n\n");
}

function buildProjects(projects?: any[]) {
  if (!projects || projects.length === 0) return "";
  const body = projects
    .map((project) => {
      const title = project.link
        ? `\\textbf{${escapeLatex(project.name)}} ${linkify(project.link)}`
        : `\\textbf{${escapeLatex(project.name)}}`;
      const lines = [title];
      if (project.description) lines.push(escapeLatex(project.description));
      if (project.techStack) lines.push(`\\textit{Tech Stack:} ${escapeLatex(project.techStack)}`);
      if (project.skillsUsed) lines.push(`\\textit{Skills Used:} ${escapeLatex(project.skillsUsed)}`);
      if (project.highlights?.length) {
        lines.push(
          `\\begin{itemize}\n${project.highlights.map((b: string) => `\\item ${escapeLatex(b)}`).join("\n")}\n\\end{itemize}`,
        );
      }
      return lines.join("\\\\\n");
    })
    .join("\n\n");

  return `\\section{Projects}\n${body}`;
}

export async function generateResume(jsonPath: string, outputPath: string) {
  const text = readText(jsonPath);
  const data = JSON.parse(text);

  const contact = [data.location, data.phone, data.email, data.linkedin, data.portfolio]
    .filter(Boolean)
    .map((item: string) => linkify(item))
    .join(" \\textbar{} ");

  const tex = fillTemplate({
    name: escapeLatex(data.name),
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
    pdf.on("error", reject);
    stream.on("finish", () => resolve(outputPath));
    stream.on("error", reject);
  });
}

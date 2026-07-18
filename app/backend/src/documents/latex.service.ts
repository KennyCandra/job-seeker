import { Injectable, Logger } from "@nestjs/common";
import latex from "node-latex";
import { mkdirSync, createWriteStream, writeFileSync, existsSync, readFileSync } from "fs";
import { dirname, join } from "path";
import { TEMPLATES_DIR } from "../common/paths";
import type { ProfileData, TailoredResumeContent, ExperienceItem, ProjectItem, SkillGroup } from "../shared/types";

const TEMPLATE_PATH = join(TEMPLATES_DIR, "resume.tex");

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

@Injectable()
export class LatexService {
  private readonly logger = new Logger(LatexService.name);

  private loadTemplate(): string {
    if (existsSync(TEMPLATE_PATH)) {
      return readFileSync(TEMPLATE_PATH, "utf-8");
    }
    return fallbackTemplate;
  }

  sanitizeLatex(text: string): string {
    return text
      .replace(/\\/g, "\\textbackslash{}")
      .replace(/[&%$#_{}]/g, (char) => `\\${char}`)
      .replace(/~/g, "\\textasciitilde{}")
      .replace(/\^/g, "\\textasciicircum{}");
  }

  private boldTech(text: string): string {
    return text.replace(/<<(.+?)>>/g, "\\textbf{$1}");
  }

  private fillTemplate(data: Record<string, string>): string {
    const template = this.loadTemplate();
    let tex = template;
    for (const [key, value] of Object.entries(data)) {
      tex = tex.replaceAll(`{{{${key}}}}`, value);
    }
    return tex;
  }

  private latexPath(path: string): string {
    return path.replace(/\\/g, "/");
  }

  private linkify(text?: string): string {
    if (!text) return "";
    const escaped = text.replace(/&/g, "\\&");
    return `\\href{${escaped}}{${this.sanitizeLatex(text)}}`;
  }

  private linkifyWithLabel(url: string | undefined, label: string): string {
    if (!url) return "";
    const escaped = url.replace(/&/g, "\\&");
    return `\\href{${escaped}}{${label}}`;
  }

  private buildExperienceHeader(job: ExperienceItem): string {
    const company = this.sanitizeLatex(job.company || "");
    const title = this.sanitizeLatex(job.title || "");
    const dates = this.sanitizeLatex(job.dates || "");
    const role =
      company && title
        ? `\\textbf{${company}} \\textcolor{subtle}{·} \\textit{${title}}`
        : `\\textbf{${company || title}}`;
    return dates ? `${role} \\hfill {\\small\\textcolor{subtle}{${dates}}}` : role;
  }

  private buildExperienceBullets(bullets?: string[]): string {
    if (!bullets || bullets.length === 0) return "";
    const items = bullets.map((b) => `\\item {\\small ${this.boldTech(this.sanitizeLatex(b))}}`).join("\n");
    return `\\vspace{0.5pt}\n\\begin{itemize}\n${items}\n\\end{itemize}`;
  }

  private buildExperience(jobs: ExperienceItem[]): string {
    return jobs
      .map((job) => `${this.buildExperienceHeader(job)}${this.buildExperienceBullets(job.bullets)}`)
      .join("\n\\vspace{4pt}\n");
  }

  private buildSkills(skills: string[] | SkillGroup[]): string {
    if (!skills.length) return "";
    if (typeof skills[0] === "string") {
      return (skills as string[]).map((s) => `\\textbf{${this.sanitizeLatex(s)}}`).join(" | ");
    }

    const cells = (skills as SkillGroup[]).map((group) => {
      const items = group.items.map((item) => this.sanitizeLatex(item)).join(", ");
      return `\\textbf{${this.sanitizeLatex(group.category)}}\\newline ${items}`;
    });

    const columns = 3;
    const lines: string[] = [];
    for (let i = 0; i < cells.length; i += columns) {
      const chunk = cells.slice(i, i + columns);
      while (chunk.length < columns) chunk.push(" ");
      lines.push(chunk.join(" & "));
    }

    return ["\\begin{tabularx}{\\textwidth}{X X X}", ...lines.map((line) => `${line} \\\\[3pt]`), "\\end{tabularx}"].join(
      "\n",
    );
  }

  private buildEducation(edu: ProfileData["education"]): string {
    if (!edu || edu.length === 0) return "";
    const body = edu
      .map((e) => {
        const course = this.sanitizeLatex(e.degree);
        const provider = this.sanitizeLatex(e.school);
        const year = this.sanitizeLatex(e.year || "");
        const label = provider && year ? `${course} — ${provider} (${year})` : provider ? `${course} — ${provider}` : course;
        return `\\item ${label}`;
      })
      .join("\n");
    return `\\section{Coursework}\n\\begin{itemize}\n${body}\n\\end{itemize}`;
  }

  private buildProjects(projects?: ProjectItem[]): string {
    if (!projects || projects.length === 0) return "";
    const body = projects
      .map((project) => {
        const title = project.link
          ? `\\textbf{${this.sanitizeLatex(project.name)}} ${this.linkify(project.link)}`
          : `\\textbf{${this.sanitizeLatex(project.name)}}`;
        const lines = [title];
        if (project.description) lines.push(this.sanitizeLatex(project.description));
        const details = lines.join("\\\\[0.5pt]\n");
        if (project.highlights?.length) {
          const bullets = project.highlights
            .slice(0, 4)
            .map((b) => `\\item ${this.boldTech(this.sanitizeLatex(b))}`)
            .join("\n");
          return `${details}\n\\vspace{2pt}\n\\begin{itemize}\n${bullets}\n\\end{itemize}`;
        }
        return details;
      })
      .join("\n\\vspace{4pt}\n");

    return `\\section{Projects}\n${body}`;
  }

  buildTex(resume: TailoredResumeContent, profileData: ProfileData): string {
    const contact = [
      profileData.location,
      profileData.phone,
      profileData.email,
      this.linkifyWithLabel(profileData.linkedin, "\\linkedinIcon"),
      this.linkifyWithLabel(profileData.portfolio, "Portfolio"),
      this.linkifyWithLabel(profileData.github, "\\githubIcon"),
    ]
      .filter((item): item is string => Boolean(item))
      .map((item) => (item.startsWith("\\href{") ? item : this.linkify(item)))
      .join(" \\;\\textcolor{divider}{\\textbar{}}\\; ");

    return this.fillTemplate({
      name: this.sanitizeLatex(profileData.name),
      githubIconPath: this.latexPath(join(TEMPLATES_DIR, "assets", "github.png")),
      linkedinIconPath: this.latexPath(join(TEMPLATES_DIR, "assets", "linkedin.png")),
      contact,
      experience: this.buildExperience(resume.experience),
      skills: this.buildSkills(resume.skills),
      education: this.buildEducation(profileData.education),
      projectsSection: this.buildProjects(resume.projects),
    });
  }

  async compilePdf(tex: string, outputPath: string): Promise<string> {
    mkdirSync(dirname(outputPath), { recursive: true });

    const texPath = outputPath.replace(/\.pdf$/, ".tex");
    writeFileSync(texPath, tex, "utf-8");

    return new Promise((resolve, reject) => {
      const pdf = latex(tex);
      const stream = pdf.pipe(createWriteStream(outputPath));
      pdf.on("error", (err: Error) => {
        this.logger.error(`Compilation error: ${err.message}`);
        reject(err);
      });
      stream.on("finish", () => resolve(outputPath));
      stream.on("error", (err: Error) => {
        this.logger.error(`Stream error: ${err.message}`);
        reject(err);
      });
    });
  }
}

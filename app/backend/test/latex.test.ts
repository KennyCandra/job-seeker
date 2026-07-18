import { describe, it, expect } from "bun:test";
import { readFileSync, rmSync, mkdtempSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { LatexService } from "../src/documents/latex.service";
import type { ProfileData, TailoredResumeContent } from "../src/shared/types";

describe("LatexService.sanitizeLatex", () => {
  const latex = new LatexService();

  it("escapes special LaTeX characters", () => {
    expect(latex.sanitizeLatex("A & B % C $ D # E _ F")).toBe("A \\& B \\% C \\$ D \\# E \\_ F");
    expect(latex.sanitizeLatex("{braces}")).toBe("\\{braces\\}");
    expect(latex.sanitizeLatex("a~b")).toBe("a\\textasciitilde{}b");
    expect(latex.sanitizeLatex("a^b")).toBe("a\\textasciicircum{}b");
  });

  it("escapes backslashes, whose own braces then get re-escaped by the brace pass (matches original behavior)", () => {
    expect(latex.sanitizeLatex("C:\\path")).toBe("C:\\textbackslash\\{\\}path");
  });
});

describe("LatexService.buildTex", () => {
  const latex = new LatexService();

  const profile: ProfileData = {
    name: "Jane Doe",
    email: "jane@example.com",
    phone: "+1 555 0100",
    location: "Remote",
    linkedin: "https://linkedin.com/in/janedoe",
    portfolio: "https://jane.dev",
    github: "https://github.com/janedoe",
    skills: [{ category: "Languages", items: ["TypeScript", "Go"] }],
    experience: [],
    projects: [],
    education: [{ degree: "BSc Computer Science", school: "State University", year: "2020" }],
  };

  it("renders a string skills list inline", () => {
    const resume: TailoredResumeContent = { experience: [], skills: ["TypeScript", "<<Go>>"] };
    const tex = latex.buildTex(resume, profile);
    expect(tex).toContain("\\textbf{TypeScript}");
    expect(tex).toContain("\\textbf{<<Go>>}");
  });

  it("renders grouped skills as a tabularx grid", () => {
    const resume: TailoredResumeContent = {
      experience: [],
      skills: [{ category: "Languages", items: ["TypeScript", "Go"] }],
    };
    const tex = latex.buildTex(resume, profile);
    expect(tex).toContain("\\begin{tabularx}{\\textwidth}{X X X}");
    expect(tex).toContain("\\textbf{Languages}\\newline TypeScript, Go");
  });

  it("bolds <<tech>> markers in experience bullets", () => {
    const resume: TailoredResumeContent = {
      experience: [
        { title: "Engineer", company: "Acme", dates: "2021-2023", bullets: ["Built services in <<Go>> and <<Postgres>>"] },
      ],
      skills: [],
    };
    const tex = latex.buildTex(resume, profile);
    expect(tex).toContain("\\textbf{Go}");
    expect(tex).toContain("\\textbf{Postgres}");
    expect(tex).toContain("\\textbf{Acme}");
  });

  it("caps project highlights at 4 bullets", () => {
    const resume: TailoredResumeContent = {
      experience: [],
      skills: [],
      projects: [
        {
          name: "Widget",
          highlights: ["one", "two", "three", "four", "five", "six"],
        },
      ],
    };
    const noEducation: ProfileData = { ...profile, education: [] };
    const tex = latex.buildTex(resume, noEducation);
    const bulletCount = (tex.match(/\\item /g) || []).length;
    expect(bulletCount).toBe(4);
  });

  it("renders education as a Coursework section", () => {
    const resume: TailoredResumeContent = { experience: [], skills: [] };
    const tex = latex.buildTex(resume, profile);
    expect(tex).toContain("\\section{Coursework}");
    expect(tex).toContain("BSc Computer Science — State University (2020)");
  });
});

describe("LatexService.compilePdf", () => {
  it(
    "compiles a resume into a real PDF file",
    async () => {
      const latex = new LatexService();
      const profile: ProfileData = {
        name: "Jane Doe",
        email: "jane@example.com",
        phone: "+1 555 0100",
        location: "Remote",
        linkedin: "https://linkedin.com/in/janedoe",
        skills: ["TypeScript", "Go"],
        experience: [{ title: "Engineer", company: "Acme", dates: "2021-2023", bullets: ["Shipped things"] }],
        projects: [],
        education: [],
      };
      const resume: TailoredResumeContent = {
        experience: profile.experience,
        skills: profile.skills,
      };

      const tex = latex.buildTex(resume, profile);
      const dir = mkdtempSync(join(tmpdir(), "cv-pdf-test-"));
      const outputPath = join(dir, "resume.pdf");

      try {
        await latex.compilePdf(tex, outputPath);
        const buf = readFileSync(outputPath);
        expect(buf.subarray(0, 4).toString("ascii")).toBe("%PDF");
      } finally {
        rmSync(dir, { recursive: true, force: true });
      }
    },
    20000,
  );
});

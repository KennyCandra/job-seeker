import { describe, it, expect } from "bun:test";
import { readFileSync, rmSync, existsSync } from "fs";
import { join } from "path";
import type { DataSource } from "typeorm";
import { GeneratorService } from "../src/documents/generator.service";
import { JobsRepository } from "../src/database/repositories/jobs.repository";
import { JobDocumentsRepository } from "../src/database/repositories/job-documents.repository";
import { UserProfileRepository } from "../src/database/repositories/user-profile.repository";
import { UserAnswersRepository } from "../src/database/repositories/user-answers.repository";
import { LatexService } from "../src/documents/latex.service";
import { JOBS_DIR } from "../src/common/paths";
import type { TailoredResumeContent, ApplicationPayload } from "../src/shared/types";

/**
 * Minimal stateful fake DataSource: stores inserted job_documents rows in
 * memory and answers the exact SELECT shapes the repositories issue, so the
 * generator's full read -> generate -> save -> read-back cycle can be
 * exercised without a live Postgres instance.
 */
class FakeDataSource {
  jobDocs = new Map<string, Record<string, unknown>>();
  jobRow: Record<string, unknown> | null = null;
  profileRow: Record<string, unknown> | null = null;

  async query(sql: string, params: unknown[] = []): Promise<any[]> {
    if (sql.includes("FROM jobs j INNER JOIN companies")) {
      return this.jobRow && this.jobRow.id === params[0] ? [this.jobRow] : [];
    }
    if (sql.startsWith("INSERT INTO job_documents")) {
      const [id, jobId, type, status, content, filePath, metadata, createdBy, createdAt] = params as string[];
      this.jobDocs.set(id, {
        id,
        job_id: jobId,
        type,
        status,
        content,
        file_path: filePath,
        metadata,
        created_by: createdBy,
        created_at: createdAt,
        updated_at: createdAt,
      });
      return [];
    }
    if (sql.includes("FROM job_documents WHERE id = $1")) {
      const row = this.jobDocs.get(params[0] as string);
      return row ? [row] : [];
    }
    if (sql.includes("FROM job_documents WHERE job_id = $1")) {
      return [...this.jobDocs.values()].filter((r) => r.job_id === params[0]);
    }
    if (sql.includes("FROM user_profile")) {
      return this.profileRow ? [this.profileRow] : [];
    }
    if (sql.includes("FROM user_answers")) {
      return [];
    }
    return [];
  }
}

const fakeConfig = { get: () => undefined } as any;

const fixtureResume: TailoredResumeContent = {
  experience: [{ title: "Engineer", company: "Acme", dates: "2021-2023", bullets: ["Shipped <<Go>> services"] }],
  skills: ["TypeScript", "Go"],
  projects: [],
};

const fixtureApplication: ApplicationPayload = {
  cover_letter: "Dear Acme, I would love to join.",
  email_subject: "Application for Engineer",
  email_body: "Please find my application attached.",
};

function makeGenerator(ds: FakeDataSource) {
  const jobs = new JobsRepository(ds as unknown as DataSource);
  const documents = new JobDocumentsRepository(ds as unknown as DataSource);
  const profile = new UserProfileRepository(ds as unknown as DataSource);
  const userAnswers = new UserAnswersRepository(ds as unknown as DataSource);
  const latex = new LatexService();
  const generator = new GeneratorService(fakeConfig, jobs, documents, profile, userAnswers, latex);
  // Swap in a stub LLM client so the test never makes a real network call.
  (generator as any).client = {
    createResume: async () => fixtureResume,
    createApplication: async () => fixtureApplication,
  };
  return generator;
}

describe("GeneratorService.generate (cv)", () => {
  it("produces a real PDF file and a job_documents row pointing at it", async () => {
    const ds = new FakeDataSource();
    ds.jobRow = {
      id: "job-1",
      company_id: 1,
      external_id: "ext-1",
      title: "Senior Engineer",
      location: "Remote",
      url: "https://example.com/job",
      description: "Build things",
      raw_json: "{}",
      content_hash: "hash",
      status: "open",
      first_seen_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      closed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      company_slug: "acme",
      company_name: "Acme",
      ats: "greenhouse",
    };
    ds.profileRow = {
      id: "default",
      fullName: "Jane Doe",
      email: "jane@example.com",
      phone: "+1 555 0100",
      location: "Remote",
      linkedin: "https://linkedin.com/in/janedoe",
      portfolio: "",
      github: "",
      headline: "",
      summary: "",
      skillsJson: "[]",
      experienceJson: "[]",
      projectsJson: "[]",
      educationJson: "[]",
      preferencesJson: "{}",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const generator = makeGenerator(ds);
    const jobDir = join(JOBS_DIR, "acme", "job-1");

    try {
      const result = await generator.generate("job-1", "cv", false);

      expect(result.exists).toBe(false);
      expect(result.document).toBeDefined();
      expect(result.document!.filePath.endsWith(".pdf")).toBe(true);
      expect(result.document!.downloadUrl).toContain("/api/jobs/job-1/documents/");

      const savedRow = [...ds.jobDocs.values()][0];
      expect(savedRow.type).toBe("cv");
      expect(String(savedRow.file_path)).toEndWith(".pdf");

      const absolutePdfPath = join(JOBS_DIR, String(savedRow.file_path));
      expect(existsSync(absolutePdfPath)).toBe(true);
      const bytes = readFileSync(absolutePdfPath);
      expect(bytes.subarray(0, 4).toString("ascii")).toBe("%PDF");
    } finally {
      rmSync(jobDir, { recursive: true, force: true });
    }
  }, 20000);

  it("reuses an existing CV's resume JSON when generating a cover letter", async () => {
    const ds = new FakeDataSource();
    ds.jobRow = {
      id: "job-2",
      company_id: 1,
      external_id: "ext-2",
      title: "Senior Engineer",
      location: "Remote",
      url: "https://example.com/job",
      description: "Build things",
      raw_json: "{}",
      content_hash: "hash",
      status: "open",
      first_seen_at: new Date().toISOString(),
      last_seen_at: new Date().toISOString(),
      closed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      company_slug: "acme",
      company_name: "Acme",
      ats: "greenhouse",
    };
    ds.profileRow = {
      id: "default",
      fullName: "Jane Doe",
      email: "jane@example.com",
      phone: "",
      location: "",
      linkedin: "",
      portfolio: "",
      github: "",
      headline: "",
      summary: "",
      skillsJson: "[]",
      experienceJson: "[]",
      projectsJson: "[]",
      educationJson: "[]",
      preferencesJson: "{}",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    // Pre-seed a cv document so the cover-letter flow should reuse its resume JSON
    // instead of calling the (stubbed-to-fail) resume generator again.
    ds.jobDocs.set("doc-existing-cv", {
      id: "doc-existing-cv",
      job_id: "job-2",
      type: "cv",
      status: "ready",
      content: JSON.stringify(fixtureResume),
      file_path: "acme/job-2/existing-cv.pdf",
      metadata: "{}",
      created_by: "system",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const generator = makeGenerator(ds);
    let resumeCallCount = 0;
    (generator as any).client.createResume = async () => {
      resumeCallCount += 1;
      throw new Error("should not regenerate resume when a cv document already exists");
    };

    const jobDir = join(JOBS_DIR, "acme", "job-2");
    try {
      const result = await generator.generate("job-2", "cover_letter", false);
      expect(result.document?.content).toBe(fixtureApplication.cover_letter);
      expect(resumeCallCount).toBe(0);
    } finally {
      rmSync(jobDir, { recursive: true, force: true });
    }
  });
});

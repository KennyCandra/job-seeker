import { eq, desc } from "drizzle-orm";
import { Repository } from "../repository";
import { applicationRuns } from "../schema";

export type ApplicationRunStatus = "running" | "review" | "needs_user" | "failed";

export type ApplicationRunRow = {
  id: string;
  jobId: string;
  status: ApplicationRunStatus;
  profilePath: string;
  outputDir: string;
  currentUrl: string;
  error: string | null;
  summary: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateApplicationRunInput = {
  id: string;
  jobId: string;
  profilePath: string;
  outputDir: string;
  currentUrl: string;
};

export class ApplicationRunsRepository extends Repository {
  create(input: CreateApplicationRunInput): void {
    const now = this.now();
    this.db.insert(applicationRuns)
      .values({
        id: input.id,
        jobId: input.jobId,
        status: "running",
        profilePath: input.profilePath,
        outputDir: input.outputDir,
        currentUrl: input.currentUrl,
        createdAt: now,
        updatedAt: now,
      })
      .run();
  }

  getById(id: string): ApplicationRunRow | undefined {
    const row = this.db.select().from(applicationRuns).where(eq(applicationRuns.id, id)).get();
    return row as ApplicationRunRow | undefined;
  }

  getLatestByJobId(jobId: string): ApplicationRunRow | undefined {
    const row = this.db.select().from(applicationRuns)
      .where(eq(applicationRuns.jobId, jobId))
      .orderBy(desc(applicationRuns.createdAt))
      .limit(1)
      .get();
    return row as ApplicationRunRow | undefined;
  }

  updateStatus(id: string, status: ApplicationRunStatus, extras?: Partial<Pick<ApplicationRunRow, "error" | "currentUrl" | "summary" | "outputDir">>): void {
    const update: Record<string, any> = { status, updatedAt: this.now() };
    if (extras?.error !== undefined) update.error = extras.error;
    if (extras?.currentUrl !== undefined) update.currentUrl = extras.currentUrl;
    if (extras?.summary !== undefined) update.summary = extras.summary;
    if (extras?.outputDir !== undefined) update.outputDir = extras.outputDir;
    this.db.update(applicationRuns).set(update).where(eq(applicationRuns.id, id)).run();
  }
}

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
  async create(input: CreateApplicationRunInput): Promise<void> {
    const now = this.now();
    await this.db.insert(applicationRuns)
      .values({
        id: input.id,
        jobId: input.jobId,
        status: "running",
        profilePath: input.profilePath,
        outputDir: input.outputDir,
        currentUrl: input.currentUrl,
        createdAt: now,
        updatedAt: now,
      });
  }

  async getById(id: string): Promise<ApplicationRunRow | undefined> {
    const [row] = await this.db.select().from(applicationRuns).where(eq(applicationRuns.id, id)).limit(1);
    return row as ApplicationRunRow | undefined;
  }

  async getLatestByJobId(jobId: string): Promise<ApplicationRunRow | undefined> {
    const [row] = await this.db.select().from(applicationRuns)
      .where(eq(applicationRuns.jobId, jobId))
      .orderBy(desc(applicationRuns.createdAt))
      .limit(1);
    return row as ApplicationRunRow | undefined;
  }

  async updateStatus(id: string, status: ApplicationRunStatus, extras?: Partial<Pick<ApplicationRunRow, "error" | "currentUrl" | "summary" | "outputDir">>): Promise<void> {
    const update: Record<string, any> = { status, updatedAt: this.now() };
    if (extras?.error !== undefined) update.error = extras.error;
    if (extras?.currentUrl !== undefined) update.currentUrl = extras.currentUrl;
    if (extras?.summary !== undefined) update.summary = extras.summary;
    if (extras?.outputDir !== undefined) update.outputDir = extras.outputDir;
    await this.db.update(applicationRuns).set(update).where(eq(applicationRuns.id, id));
  }
}

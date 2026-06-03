import { eq, desc } from "drizzle-orm";
import { Repository } from "../repository";
import { applications } from "../schema";
import { slug } from "../../shared/index";
import type { AppStatus } from "../../shared/types";

export type ApplicationRow = {
  id: string;
  jobId: string;
  company: string;
  title: string;
  location: string;
  site: string;
  url: string;
  score: number;
  status: AppStatus;
  documents: string;
  createdAt: string;
  updatedAt: string;
};

export type SaveAcceptedJobInput = {
  jobId: string;
  company: string;
  title: string;
  location: string;
  site: string;
  url: string;
  score: number;
  status?: AppStatus;
  documents?: string;
};

export class ApplicationsRepository extends Repository {
  saveAcceptedJob(input: SaveAcceptedJobInput): void {
    const now = this.now();
    const id = `${slug(input.company)}-${slug(input.title)}-${Date.now()}`;
    const status = input.status || "ready";
    const documents = input.documents || "[]";
    this.db.insert(applications)
      .values({ id, jobId: input.jobId, company: input.company, title: input.title, location: input.location, site: input.site, url: input.url, score: input.score, status, documents, createdAt: now, updatedAt: now })
      .onConflictDoUpdate({ target: applications.jobId, set: { score: input.score, status, documents: input.documents ?? "[]", updatedAt: now } })
      .run();
  }

  getRecent(limit = 20): ApplicationRow[] {
    const cols = { id: applications.id, jobId: applications.jobId, company: applications.company, title: applications.title, location: applications.location, site: applications.site, url: applications.url, score: applications.score, status: applications.status, documents: applications.documents, createdAt: applications.createdAt, updatedAt: applications.updatedAt };
    return this.db.select(cols).from(applications).orderBy(desc(applications.createdAt)).limit(limit).all() as ApplicationRow[];
  }

  getAll(): ApplicationRow[] {
    return this.db.select().from(applications).orderBy(desc(applications.score), desc(applications.createdAt)).all() as ApplicationRow[];
  }

  getByJobId(jobId: string): ApplicationRow | undefined {
    const r = this.db.select().from(applications).where(eq(applications.jobId, jobId)).get();
    return r as ApplicationRow | undefined;
  }

  updateStatus(jobId: string, status: AppStatus): void {
    this.db.update(applications).set({ status, updatedAt: this.now() }).where(eq(applications.jobId, jobId)).run();
  }

  updateDocuments(jobId: string, documents: string): void {
    this.db.update(applications).set({ documents, updatedAt: this.now() }).where(eq(applications.jobId, jobId)).run();
  }

  delete(jobId: string): void {
    this.db.delete(applications).where(eq(applications.jobId, jobId)).run();
  }

  hasJob(jobId: string): boolean {
    return !!this.getByJobId(jobId);
  }

  getProcessedJobIds(): string[] {
    return this.db.select({ jobId: applications.jobId }).from(applications).all().map((r: any) => r.jobId);
  }
}

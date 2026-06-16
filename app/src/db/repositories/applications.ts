import { eq, desc } from "drizzle-orm";
import { Repository } from "../repository";
import { applications, companies, jobs } from "../schema";
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
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type SaveAcceptedJobInput = {
  jobId: string;
  score: number;
  status?: AppStatus;
  documents?: string;
  notes?: string;
  company?: string;
  title?: string;
  location?: string;
  site?: string;
  url?: string;
};

export class ApplicationsRepository extends Repository {
  saveAcceptedJob(input: SaveAcceptedJobInput): void {
    const now = this.now();
    const id = `app-${input.jobId}-${Date.now()}`;
    const status = input.status || "ready";
    const documents = input.documents || "[]";
    this.db.insert(applications)
      .values({ id, jobId: input.jobId, score: input.score, status, documents, notes: input.notes ?? "", createdAt: now, updatedAt: now })
      .onConflictDoUpdate({ target: applications.jobId, set: { score: input.score, status, documents, notes: input.notes ?? "", updatedAt: now } })
      .run();
  }

  getRecent(limit = 20): ApplicationRow[] {
    return this.queryRows().orderBy(desc(applications.createdAt)).limit(limit).all().map(toRow);
  }

  getAll(): ApplicationRow[] {
    return this.queryRows().orderBy(desc(applications.score), desc(applications.createdAt)).all().map(toRow);
  }

  getByJobId(jobId: string): ApplicationRow | undefined {
    const r = this.queryRows().where(eq(applications.jobId, jobId)).get();
    return r ? toRow(r) : undefined;
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

  private queryRows() {
    return this.db.select({
      id: applications.id,
      jobId: applications.jobId,
      score: applications.score,
      status: applications.status,
      documents: applications.documents,
      notes: applications.notes,
      createdAt: applications.createdAt,
      updatedAt: applications.updatedAt,
      company: companies.name,
      title: jobs.title,
      location: jobs.location,
      site: companies.ats,
      url: jobs.url,
    }).from(applications)
      .innerJoin(jobs, eq(applications.jobId, jobs.id))
      .innerJoin(companies, eq(jobs.companyId, companies.id));
  }
}

function toRow(row: any): ApplicationRow {
  return {
    id: row.id,
    jobId: row.jobId,
    company: row.company,
    title: row.title,
    location: row.location,
    site: row.site,
    url: row.url,
    score: row.score,
    status: row.status as AppStatus,
    documents: row.documents,
    notes: row.notes,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

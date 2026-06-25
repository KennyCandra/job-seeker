import { eq, desc, inArray } from "drizzle-orm";
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
};

export class ApplicationsRepository extends Repository {
  async saveAcceptedJob(input: SaveAcceptedJobInput): Promise<void> {
    const now = this.now();
    const id = `app-${input.jobId}-${Date.now()}`;
    const status = input.status || "ready";
    const documents = input.documents || "[]";
    await this.db.insert(applications)
      .values({ id, jobId: input.jobId, score: input.score, status, documents, notes: input.notes ?? "", createdAt: now, updatedAt: now })
      .onConflictDoUpdate({ target: applications.jobId, set: { score: input.score, status, documents, notes: input.notes ?? "", updatedAt: now } });
  }

  async getRecent(limit = 20): Promise<ApplicationRow[]> {
    const rows = await this.queryRows().orderBy(desc(applications.createdAt)).limit(limit);
    return rows.map(toRow);
  }

  async getAll(): Promise<ApplicationRow[]> {
    const rows = await this.queryRows().orderBy(desc(applications.score), desc(applications.createdAt));
    return rows.map(toRow);
  }

  async getByJobId(jobId: string): Promise<ApplicationRow | undefined> {
    const [r] = await this.queryRows().where(eq(applications.jobId, jobId)).limit(1);
    return r ? toRow(r) : undefined;
  }

  async updateStatus(jobId: string, status: AppStatus): Promise<void> {
    await this.db.update(applications).set({ status, updatedAt: this.now() }).where(eq(applications.jobId, jobId));
  }

  async updateDocuments(jobId: string, documents: string): Promise<void> {
    await this.db.update(applications).set({ documents, updatedAt: this.now() }).where(eq(applications.jobId, jobId));
  }

  async delete(jobId: string): Promise<void> {
    await this.db.delete(applications).where(eq(applications.jobId, jobId));
  }

  async hasJob(jobId: string): Promise<boolean> {
    return Boolean(await this.getByJobId(jobId));
  }

  async getProcessedJobIds(): Promise<string[]> {
    const rows = await this.db.select({ jobId: applications.jobId }).from(applications);
    return rows.map((r) => r.jobId);
  }

  async getProcessedJobIdsFor(jobIds: string[]): Promise<string[]> {
    if (jobIds.length === 0) return [];
    const rows = await this.db.select({ jobId: applications.jobId })
      .from(applications)
      .where(inArray(applications.jobId, jobIds));
    return rows.map((r) => r.jobId);
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

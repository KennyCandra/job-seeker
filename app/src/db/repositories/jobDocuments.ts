import { eq, desc } from "drizzle-orm";
import { Repository } from "../repository";
import { jobDocuments } from "../schema";

export type SaveJobDocumentInput = {
  jobId: string;
  type: "cv" | "cover_letter" | "recommendation" | "custom";
  status?: string;
  content?: string;
  filePath?: string;
  metadata?: unknown;
  createdBy?: string;
};

export class JobDocumentsRepository extends Repository {
  async save(input: SaveJobDocumentInput): Promise<void> {
    const now = this.now();
    await this.db.insert(jobDocuments).values({
      id: `doc-${input.jobId}-${input.type}-${Date.now()}`,
      jobId: input.jobId,
      type: input.type,
      status: input.status ?? "ready",
      content: input.content ?? "",
      filePath: input.filePath ?? "",
      metadata: JSON.stringify(input.metadata ?? {}),
      createdBy: input.createdBy ?? "system",
      createdAt: now,
      updatedAt: now,
    });
  }

  async getByJobId(jobId: string): Promise<any[]> {
    return this.db.select().from(jobDocuments)
      .where(eq(jobDocuments.jobId, jobId))
      .orderBy(desc(jobDocuments.createdAt));
  }
}

import { index, pgTable, text } from "drizzle-orm/pg-core";
import { jobs } from "./jobs";

export const jobDocuments = pgTable("job_documents", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  status: text("status").notNull().default("ready"),
  content: text("content").notNull().default(""),
  filePath: text("file_path").notNull().default(""),
  metadata: text("metadata").notNull().default("{}"),
  createdBy: text("created_by").notNull().default("system"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (t) => ({
  jobTypeIdx: index("idx_job_documents_job_type").on(t.jobId, t.type),
}));

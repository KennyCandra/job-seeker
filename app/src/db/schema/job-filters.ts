import { index, integer, pgTable, text } from "drizzle-orm/pg-core";
import { jobs } from "./jobs";

export const jobFilters = pgTable("job_filters", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  contentHash: text("content_hash").notNull().default(""),
  verdict: text("verdict").notNull().default("reject"),
  score: integer("score").notNull().default(0),
  reasons: text("reasons").notNull().default("[]"),
  mustHaveHits: text("must_have_hits").notNull().default("[]"),
  missingItems: text("missing_items").notNull().default("[]"),
  model: text("model").notNull().default(""),
  promptVersion: text("prompt_version").notNull().default(""),
  createdAt: text("created_at").notNull(),
}, (t) => ({
  jobHashIdx: index("idx_job_filters_job_hash").on(t.jobId, t.contentHash),
  jobCreatedAtIdx: index("idx_job_filters_job_created_at").on(t.jobId, t.createdAt),
  jobCreatedIdIdx: index("idx_job_filters_job_created_id").on(t.jobId, t.createdAt, t.id),
  scoreIdx: index("idx_job_filters_score").on(t.score),
  verdictIdx: index("idx_job_filters_verdict").on(t.verdict),
  verdictScoreIdx: index("idx_job_filters_verdict_score").on(t.verdict, t.score),
}));

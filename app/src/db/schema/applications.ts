import { index, integer, pgTable, text } from "drizzle-orm/pg-core";
import { jobs } from "./jobs";

export const applications = pgTable("applications", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().unique().references(() => jobs.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("ready"),
  score: integer("score").notNull().default(0),
  documents: text("documents").notNull().default("[]"),
  notes: text("notes").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (t) => ({
  scoreCreatedIdx: index("idx_applications_score_created").on(t.score, t.createdAt),
  createdIdx: index("idx_applications_created_at").on(t.createdAt),
  createdIdIdx: index("idx_applications_created_desc_id").on(t.createdAt, t.id),
}));

export const applicationRuns = pgTable("application_runs", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().references(() => jobs.id, { onDelete: "cascade" }),
  status: text("status").notNull().default("running"),
  profilePath: text("profile_path").notNull().default(""),
  outputDir: text("output_dir").notNull().default(""),
  currentUrl: text("current_url").notNull().default(""),
  error: text("error"),
  summary: text("summary").notNull().default("{}"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (t) => ({
  jobStatusIdx: index("idx_app_runs_job_status").on(t.jobId, t.status),
  jobCreatedIdx: index("idx_app_runs_job_created").on(t.jobId, t.createdAt),
}));

export const applicationRunSteps = pgTable("application_run_steps", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull().references(() => applicationRuns.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  label: text("label").notNull().default(""),
  detail: text("detail").notNull().default(""),
  screenshotPath: text("screenshot_path"),
  payload: text("payload").notNull().default("{}"),
  createdAt: text("created_at").notNull(),
}, (t) => ({
  runIdx: index("idx_app_run_steps_run").on(t.runId),
  runCreatedIdx: index("idx_app_run_steps_run_created").on(t.runId, t.createdAt),
}));

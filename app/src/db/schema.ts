import { index, integer, pgTable, serial, text, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  ats: text("ats").notNull(),
  endpoint: text("endpoint").notNull(),
  active: integer("active").notNull().default(1),
  discoveredAt: text("discovered_at").notNull().default(sql`now()::text`),
  lastFetchedAt: text("last_fetched_at"),
  lastSuccessfulFetchAt: text("last_successful_fetch_at"),
  lastErrorAt: text("last_error_at"),
  lastError: text("last_error"),
  createdAt: text("created_at").notNull().default(sql`now()::text`),
  updatedAt: text("updated_at").notNull().default(sql`now()::text`),
}, (t) => ({
  activeSlugIdx: index("idx_companies_active_slug").on(t.active, t.slug),
  activeAtsIdx: index("idx_companies_active_ats").on(t.active, t.ats),
  nameIdx: index("idx_companies_name").on(t.name),
}));

export const jobs = pgTable("jobs", {
  id: text("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  externalId: text("external_id").notNull(),
  title: text("title").notNull().default(""),
  location: text("location").notNull().default(""),
  url: text("url").notNull().default(""),
  description: text("description").notNull().default(""),
  rawJson: text("raw_json").notNull().default("{}"),
  contentHash: text("content_hash").notNull().default(""),
  status: text("status").notNull().default("open"),
  firstSeenAt: text("first_seen_at").notNull(),
  lastSeenAt: text("last_seen_at").notNull(),
  closedAt: text("closed_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (t) => ({
  uniqCompanyExternal: uniqueIndex("idx_jobs_company_external").on(t.companyId, t.externalId),
  companyIdx: index("idx_jobs_company").on(t.companyId),
  statusIdx: index("idx_jobs_status").on(t.status),
  updatedAtIdx: index("idx_jobs_updated_at").on(t.updatedAt),
  updatedIdIdx: index("idx_jobs_updated_id").on(t.updatedAt, t.id),
  statusUpdatedAtIdx: index("idx_jobs_status_updated_at").on(t.status, t.updatedAt),
  statusUpdatedIdIdx: index("idx_jobs_status_updated_id").on(t.status, t.updatedAt, t.id),
  companyUpdatedAtIdx: index("idx_jobs_company_updated_at").on(t.companyId, t.updatedAt),
  companyStatusUpdatedIdx: index("idx_jobs_company_status_updated").on(t.companyId, t.status, t.updatedAt),
}));

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

export const searchConfig = pgTable("search_config", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

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

export const taskRuns = pgTable("task_runs", {
  id: text("id").primaryKey(),
  bullJobId: text("bull_job_id"),
  type: text("type").notNull(),
  status: text("status").notNull().default("queued"),
  dedupeKey: text("dedupe_key"),
  payloadJson: text("payload_json").notNull().default("{}"),
  progressJson: text("progress_json"),
  resultJson: text("result_json"),
  error: text("error"),
  createdAt: text("created_at").notNull(),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
  updatedAt: text("updated_at").notNull(),
}, (t) => ({
  statusIdx: index("idx_task_runs_status").on(t.status),
  typeIdx: index("idx_task_runs_type").on(t.type),
  dedupeKeyIdx: index("idx_task_runs_dedupe_key").on(t.dedupeKey),
  createdIdx: index("idx_task_runs_created_at").on(t.createdAt),
  statusCreatedIdx: index("idx_task_runs_status_created").on(t.status, t.createdAt),
}));

export const taskRunLogs = pgTable("task_run_logs", {
  id: text("id").primaryKey(),
  runId: text("run_id").notNull().references(() => taskRuns.id, { onDelete: "cascade" }),
  level: text("level").notNull().default("info"),
  message: text("message").notNull(),
  payloadJson: text("payload_json"),
  createdAt: text("created_at").notNull(),
}, (t) => ({
  runIdx: index("idx_task_run_logs_run").on(t.runId),
  runCreatedIdx: index("idx_task_run_logs_run_created").on(t.runId, t.createdAt),
}));

export const userProfile = pgTable("user_profile", {
  id: text("id").primaryKey().default("default"),
  fullName: text("full_name").notNull().default(""),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  location: text("location").notNull().default(""),
  linkedin: text("linkedin").notNull().default(""),
  portfolio: text("portfolio").notNull().default(""),
  github: text("github").notNull().default(""),
  headline: text("headline").notNull().default(""),
  summary: text("summary").notNull().default(""),
  skillsJson: text("skills_json").notNull().default("[]"),
  experienceJson: text("experience_json").notNull().default("[]"),
  projectsJson: text("projects_json").notNull().default("[]"),
  educationJson: text("education_json").notNull().default("[]"),
  preferencesJson: text("preferences_json").notNull().default("{}"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const userAnswers = pgTable("user_answers", {
  id: text("id").primaryKey(),
  category: text("category").notNull().default(""),
  question: text("question").notNull().default(""),
  answer: text("answer").notNull().default(""),
  tagsJson: text("tags_json").notNull().default("[]"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (t) => ({
  categoryCreatedIdx: index("idx_user_answers_category_created").on(t.category, t.createdAt),
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

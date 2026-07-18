import { index, pgTable, text } from "drizzle-orm/pg-core";

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

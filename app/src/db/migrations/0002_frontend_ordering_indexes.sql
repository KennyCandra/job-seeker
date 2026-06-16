CREATE INDEX IF NOT EXISTS "idx_jobs_updated_desc_id" ON "jobs" USING btree ("updated_at" DESC, "id" ASC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_jobs_status_updated_desc_id" ON "jobs" USING btree ("status", "updated_at" DESC, "id" ASC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_jobs_company_updated_desc_id" ON "jobs" USING btree ("company_id", "updated_at" DESC, "id" ASC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_jobs_company_status_updated_desc_id" ON "jobs" USING btree ("company_id", "status", "updated_at" DESC, "id" ASC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_job_filters_job_created_desc_id" ON "job_filters" USING btree ("job_id", "created_at" DESC, "id" ASC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_task_runs_created_desc" ON "task_runs" USING btree ("created_at" DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_task_runs_status_created_desc" ON "task_runs" USING btree ("status", "created_at" DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_task_run_logs_run_created_desc" ON "task_run_logs" USING btree ("run_id", "created_at" DESC);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_app_runs_job_created_desc" ON "application_runs" USING btree ("job_id", "created_at" DESC);

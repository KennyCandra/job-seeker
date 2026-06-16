CREATE INDEX "idx_app_run_steps_run_created" ON "application_run_steps" USING btree ("run_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_app_runs_job_created" ON "application_runs" USING btree ("job_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_applications_score_created" ON "applications" USING btree ("score","created_at");--> statement-breakpoint
CREATE INDEX "idx_applications_created_at" ON "applications" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_companies_active_slug" ON "companies" USING btree ("active","slug");--> statement-breakpoint
CREATE INDEX "idx_companies_active_ats" ON "companies" USING btree ("active","ats");--> statement-breakpoint
CREATE INDEX "idx_companies_name" ON "companies" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_job_filters_job_created_id" ON "job_filters" USING btree ("job_id","created_at","id");--> statement-breakpoint
CREATE INDEX "idx_job_filters_verdict_score" ON "job_filters" USING btree ("verdict","score");--> statement-breakpoint
CREATE INDEX "idx_jobs_updated_id" ON "jobs" USING btree ("updated_at","id");--> statement-breakpoint
CREATE INDEX "idx_jobs_status_updated_id" ON "jobs" USING btree ("status","updated_at","id");--> statement-breakpoint
CREATE INDEX "idx_jobs_company_status_updated" ON "jobs" USING btree ("company_id","status","updated_at");--> statement-breakpoint
CREATE INDEX "idx_task_run_logs_run_created" ON "task_run_logs" USING btree ("run_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_task_runs_created_at" ON "task_runs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_task_runs_status_created" ON "task_runs" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "idx_user_answers_category_created" ON "user_answers" USING btree ("category","created_at");--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX "idx_jobs_title_trgm" ON "jobs" USING gin (LOWER("title") gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "idx_jobs_location_trgm" ON "jobs" USING gin (LOWER("location") gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "idx_companies_name_trgm" ON "companies" USING gin (LOWER("name") gin_trgm_ops);

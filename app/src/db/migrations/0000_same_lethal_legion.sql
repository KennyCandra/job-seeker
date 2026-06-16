CREATE TABLE "application_run_steps" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"type" text NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"screenshot_path" text,
	"payload" text DEFAULT '{}' NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "application_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"profile_path" text DEFAULT '' NOT NULL,
	"output_dir" text DEFAULT '' NOT NULL,
	"current_url" text DEFAULT '' NOT NULL,
	"error" text,
	"summary" text DEFAULT '{}' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "applications" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"status" text DEFAULT 'ready' NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"documents" text DEFAULT '[]' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL,
	CONSTRAINT "applications_job_id_unique" UNIQUE("job_id")
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"ats" text NOT NULL,
	"endpoint" text NOT NULL,
	"active" integer DEFAULT 1 NOT NULL,
	"discovered_at" text DEFAULT now()::text NOT NULL,
	"last_fetched_at" text,
	"last_successful_fetch_at" text,
	"last_error_at" text,
	"last_error" text,
	"created_at" text DEFAULT now()::text NOT NULL,
	"updated_at" text DEFAULT now()::text NOT NULL,
	CONSTRAINT "companies_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "job_documents" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'ready' NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"file_path" text DEFAULT '' NOT NULL,
	"metadata" text DEFAULT '{}' NOT NULL,
	"created_by" text DEFAULT 'system' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_filters" (
	"id" text PRIMARY KEY NOT NULL,
	"job_id" text NOT NULL,
	"content_hash" text DEFAULT '' NOT NULL,
	"verdict" text DEFAULT 'reject' NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"reasons" text DEFAULT '[]' NOT NULL,
	"must_have_hits" text DEFAULT '[]' NOT NULL,
	"missing_items" text DEFAULT '[]' NOT NULL,
	"model" text DEFAULT '' NOT NULL,
	"prompt_version" text DEFAULT '' NOT NULL,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"company_id" integer NOT NULL,
	"external_id" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"url" text DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"raw_json" text DEFAULT '{}' NOT NULL,
	"content_hash" text DEFAULT '' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"first_seen_at" text NOT NULL,
	"last_seen_at" text NOT NULL,
	"closed_at" text,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_config" (
	"key" text PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_run_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"run_id" text NOT NULL,
	"level" text DEFAULT 'info' NOT NULL,
	"message" text NOT NULL,
	"payload_json" text,
	"created_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_runs" (
	"id" text PRIMARY KEY NOT NULL,
	"bull_job_id" text,
	"type" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"dedupe_key" text,
	"payload_json" text DEFAULT '{}' NOT NULL,
	"progress_json" text,
	"result_json" text,
	"error" text,
	"created_at" text NOT NULL,
	"started_at" text,
	"completed_at" text,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_answers" (
	"id" text PRIMARY KEY NOT NULL,
	"category" text DEFAULT '' NOT NULL,
	"question" text DEFAULT '' NOT NULL,
	"answer" text DEFAULT '' NOT NULL,
	"tags_json" text DEFAULT '[]' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_profile" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"full_name" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"location" text DEFAULT '' NOT NULL,
	"linkedin" text DEFAULT '' NOT NULL,
	"portfolio" text DEFAULT '' NOT NULL,
	"github" text DEFAULT '' NOT NULL,
	"headline" text DEFAULT '' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"skills_json" text DEFAULT '[]' NOT NULL,
	"experience_json" text DEFAULT '[]' NOT NULL,
	"projects_json" text DEFAULT '[]' NOT NULL,
	"education_json" text DEFAULT '[]' NOT NULL,
	"preferences_json" text DEFAULT '{}' NOT NULL,
	"created_at" text NOT NULL,
	"updated_at" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "application_run_steps" ADD CONSTRAINT "application_run_steps_run_id_application_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."application_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_runs" ADD CONSTRAINT "application_runs_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "applications" ADD CONSTRAINT "applications_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_documents" ADD CONSTRAINT "job_documents_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_filters" ADD CONSTRAINT "job_filters_job_id_jobs_id_fk" FOREIGN KEY ("job_id") REFERENCES "public"."jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_run_logs" ADD CONSTRAINT "task_run_logs_run_id_task_runs_id_fk" FOREIGN KEY ("run_id") REFERENCES "public"."task_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_app_run_steps_run" ON "application_run_steps" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "idx_app_runs_job_status" ON "application_runs" USING btree ("job_id","status");--> statement-breakpoint
CREATE INDEX "idx_job_documents_job_type" ON "job_documents" USING btree ("job_id","type");--> statement-breakpoint
CREATE INDEX "idx_job_filters_job_hash" ON "job_filters" USING btree ("job_id","content_hash");--> statement-breakpoint
CREATE INDEX "idx_job_filters_job_created_at" ON "job_filters" USING btree ("job_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_job_filters_score" ON "job_filters" USING btree ("score");--> statement-breakpoint
CREATE INDEX "idx_job_filters_verdict" ON "job_filters" USING btree ("verdict");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_jobs_company_external" ON "jobs" USING btree ("company_id","external_id");--> statement-breakpoint
CREATE INDEX "idx_jobs_company" ON "jobs" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_jobs_status" ON "jobs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_jobs_updated_at" ON "jobs" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_jobs_status_updated_at" ON "jobs" USING btree ("status","updated_at");--> statement-breakpoint
CREATE INDEX "idx_jobs_company_updated_at" ON "jobs" USING btree ("company_id","updated_at");--> statement-breakpoint
CREATE INDEX "idx_task_run_logs_run" ON "task_run_logs" USING btree ("run_id");--> statement-breakpoint
CREATE INDEX "idx_task_runs_status" ON "task_runs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_task_runs_type" ON "task_runs" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_task_runs_dedupe_key" ON "task_runs" USING btree ("dedupe_key");
import { MigrationInterface, QueryRunner } from "typeorm";

export class BaselineSchema1784286666606 implements MigrationInterface {
    name = 'BaselineSchema1784286666606'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "companies" ("id" SERIAL NOT NULL, "name" text NOT NULL, "slug" text NOT NULL, "ats" text NOT NULL, "endpoint" text NOT NULL, "active" integer NOT NULL DEFAULT '1', "discovered_at" text NOT NULL, "last_fetched_at" text, "last_successful_fetch_at" text, "last_error_at" text, "last_error" text, "created_at" text NOT NULL, "updated_at" text NOT NULL, CONSTRAINT "UQ_b28b07d25e4324eee577de5496d" UNIQUE ("slug"), CONSTRAINT "PK_d4bc3e82a314fa9e29f652c2c22" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_companies_name" ON "companies" ("name") `);
        await queryRunner.query(`CREATE INDEX "idx_companies_active_ats" ON "companies" ("active", "ats") `);
        await queryRunner.query(`CREATE INDEX "idx_companies_active_slug" ON "companies" ("active", "slug") `);
        await queryRunner.query(`CREATE TABLE "jobs" ("id" text NOT NULL, "company_id" integer NOT NULL, "external_id" text NOT NULL, "title" text NOT NULL DEFAULT '', "location" text NOT NULL DEFAULT '', "url" text NOT NULL DEFAULT '', "description" text NOT NULL DEFAULT '', "raw_json" text NOT NULL DEFAULT '{}', "content_hash" text NOT NULL DEFAULT '', "status" text NOT NULL DEFAULT 'open', "first_seen_at" text NOT NULL, "last_seen_at" text NOT NULL, "closed_at" text, "created_at" text NOT NULL, "updated_at" text NOT NULL, CONSTRAINT "PK_cf0a6c42b72fcc7f7c237def345" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_jobs_company_status_updated" ON "jobs" ("company_id", "status", "updated_at") `);
        await queryRunner.query(`CREATE INDEX "idx_jobs_company_updated_at" ON "jobs" ("company_id", "updated_at") `);
        await queryRunner.query(`CREATE INDEX "idx_jobs_status_updated_id" ON "jobs" ("status", "updated_at", "id") `);
        await queryRunner.query(`CREATE INDEX "idx_jobs_status_updated_at" ON "jobs" ("status", "updated_at") `);
        await queryRunner.query(`CREATE INDEX "idx_jobs_updated_id" ON "jobs" ("updated_at", "id") `);
        await queryRunner.query(`CREATE INDEX "idx_jobs_updated_at" ON "jobs" ("updated_at") `);
        await queryRunner.query(`CREATE INDEX "idx_jobs_status" ON "jobs" ("status") `);
        await queryRunner.query(`CREATE INDEX "idx_jobs_company" ON "jobs" ("company_id") `);
        await queryRunner.query(`CREATE UNIQUE INDEX "idx_jobs_company_external" ON "jobs" ("company_id", "external_id") `);
        await queryRunner.query(`CREATE TABLE "job_filters" ("id" text NOT NULL, "job_id" text NOT NULL, "content_hash" text NOT NULL DEFAULT '', "verdict" text NOT NULL DEFAULT 'reject', "score" integer NOT NULL DEFAULT '0', "reasons" text NOT NULL DEFAULT '[]', "must_have_hits" text NOT NULL DEFAULT '[]', "missing_items" text NOT NULL DEFAULT '[]', "model" text NOT NULL DEFAULT '', "prompt_version" text NOT NULL DEFAULT '', "created_at" text NOT NULL, CONSTRAINT "PK_a87002c3476fd8c90bfb38b3473" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "applications" ("id" text NOT NULL, "job_id" text NOT NULL, "status" text NOT NULL DEFAULT 'ready', "score" integer NOT NULL DEFAULT '0', "documents" text NOT NULL DEFAULT '[]', "notes" text NOT NULL DEFAULT '', "created_at" text NOT NULL, "updated_at" text NOT NULL, CONSTRAINT "UQ_8aba14d7f098c23ba06d8693235" UNIQUE ("job_id"), CONSTRAINT "PK_938c0a27255637bde919591888f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_applications_created_desc_id" ON "applications" ("created_at", "id") `);
        await queryRunner.query(`CREATE INDEX "idx_applications_created_at" ON "applications" ("created_at") `);
        await queryRunner.query(`CREATE INDEX "idx_applications_score_created" ON "applications" ("score", "created_at") `);
        await queryRunner.query(`CREATE TABLE "application_runs" ("id" text NOT NULL, "job_id" text NOT NULL, "status" text NOT NULL DEFAULT 'running', "profile_path" text NOT NULL DEFAULT '', "output_dir" text NOT NULL DEFAULT '', "current_url" text NOT NULL DEFAULT '', "error" text, "summary" text NOT NULL DEFAULT '{}', "created_at" text NOT NULL, "updated_at" text NOT NULL, CONSTRAINT "PK_881fe6e8f37a79d8e99597b3368" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_app_runs_job_created" ON "application_runs" ("job_id", "created_at") `);
        await queryRunner.query(`CREATE INDEX "idx_app_runs_job_status" ON "application_runs" ("job_id", "status") `);
        await queryRunner.query(`CREATE TABLE "application_run_steps" ("id" text NOT NULL, "run_id" text NOT NULL, "type" text NOT NULL, "label" text NOT NULL DEFAULT '', "detail" text NOT NULL DEFAULT '', "screenshot_path" text, "payload" text NOT NULL DEFAULT '{}', "created_at" text NOT NULL, CONSTRAINT "PK_7ea77991282a99fe2c9d9af1cf3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_app_run_steps_run_created" ON "application_run_steps" ("run_id", "created_at") `);
        await queryRunner.query(`CREATE INDEX "idx_app_run_steps_run" ON "application_run_steps" ("run_id") `);
        await queryRunner.query(`CREATE TABLE "job_documents" ("id" text NOT NULL, "job_id" text NOT NULL, "type" text NOT NULL, "status" text NOT NULL DEFAULT 'ready', "content" text NOT NULL DEFAULT '', "file_path" text NOT NULL DEFAULT '', "metadata" text NOT NULL DEFAULT '{}', "created_by" text NOT NULL DEFAULT 'system', "created_at" text NOT NULL, "updated_at" text NOT NULL, CONSTRAINT "PK_9dc32a336a08a50998f035ee23d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_job_documents_job_type" ON "job_documents" ("job_id", "type") `);
        await queryRunner.query(`CREATE TABLE "search_config" ("key" text NOT NULL, "value" text NOT NULL, CONSTRAINT "PK_4b1e915fbce0f654da6dcc152a8" PRIMARY KEY ("key"))`);
        await queryRunner.query(`CREATE TABLE "task_runs" ("id" text NOT NULL, "bull_job_id" text, "type" text NOT NULL, "status" text NOT NULL DEFAULT 'queued', "dedupe_key" text, "payload_json" text NOT NULL DEFAULT '{}', "progress_json" text, "result_json" text, "error" text, "created_at" text NOT NULL, "started_at" text, "completed_at" text, "updated_at" text NOT NULL, CONSTRAINT "PK_52c37d0e12c4de37ae7bbff7850" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_task_runs_status_created" ON "task_runs" ("status", "created_at") `);
        await queryRunner.query(`CREATE INDEX "idx_task_runs_created_at" ON "task_runs" ("created_at") `);
        await queryRunner.query(`CREATE INDEX "idx_task_runs_dedupe_key" ON "task_runs" ("dedupe_key") `);
        await queryRunner.query(`CREATE INDEX "idx_task_runs_type" ON "task_runs" ("type") `);
        await queryRunner.query(`CREATE INDEX "idx_task_runs_status" ON "task_runs" ("status") `);
        await queryRunner.query(`CREATE TABLE "task_run_logs" ("id" text NOT NULL, "run_id" text NOT NULL, "level" text NOT NULL DEFAULT 'info', "message" text NOT NULL, "payload_json" text, "created_at" text NOT NULL, CONSTRAINT "PK_30f43a47841831c97578775c310" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_task_run_logs_run_created" ON "task_run_logs" ("run_id", "created_at") `);
        await queryRunner.query(`CREATE INDEX "idx_task_run_logs_run" ON "task_run_logs" ("run_id") `);
        await queryRunner.query(`CREATE TABLE "user_profile" ("id" text NOT NULL DEFAULT 'default', "full_name" text NOT NULL DEFAULT '', "email" text NOT NULL DEFAULT '', "phone" text NOT NULL DEFAULT '', "location" text NOT NULL DEFAULT '', "linkedin" text NOT NULL DEFAULT '', "portfolio" text NOT NULL DEFAULT '', "github" text NOT NULL DEFAULT '', "headline" text NOT NULL DEFAULT '', "summary" text NOT NULL DEFAULT '', "skills_json" text NOT NULL DEFAULT '[]', "experience_json" text NOT NULL DEFAULT '[]', "projects_json" text NOT NULL DEFAULT '[]', "education_json" text NOT NULL DEFAULT '[]', "preferences_json" text NOT NULL DEFAULT '{}', "created_at" text NOT NULL, "updated_at" text NOT NULL, CONSTRAINT "PK_f44d0cd18cfd80b0fed7806c3b7" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "user_answers" ("id" text NOT NULL, "category" text NOT NULL DEFAULT '', "question" text NOT NULL DEFAULT '', "answer" text NOT NULL DEFAULT '', "tags_json" text NOT NULL DEFAULT '[]', "created_at" text NOT NULL, "updated_at" text NOT NULL, CONSTRAINT "PK_08977c1a2a5f1b8b472dbd87d04" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "idx_user_answers_category_created" ON "user_answers" ("category", "created_at") `);

        await queryRunner.query(`ALTER TABLE "jobs" ADD CONSTRAINT "FK_jobs_company_id" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "job_documents" ADD CONSTRAINT "FK_job_documents_job_id" FOREIGN KEY ("job_id") REFERENCES "jobs" ("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "applications" ADD CONSTRAINT "FK_applications_job_id" FOREIGN KEY ("job_id") REFERENCES "jobs" ("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "application_runs" ADD CONSTRAINT "FK_application_runs_job_id" FOREIGN KEY ("job_id") REFERENCES "jobs" ("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "application_run_steps" ADD CONSTRAINT "FK_application_run_steps_run_id" FOREIGN KEY ("run_id") REFERENCES "application_runs" ("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "task_run_logs" ADD CONSTRAINT "FK_task_run_logs_run_id" FOREIGN KEY ("run_id") REFERENCES "task_runs" ("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "job_filters" ADD CONSTRAINT "FK_job_filters_job_id" FOREIGN KEY ("job_id") REFERENCES "jobs" ("id") ON DELETE CASCADE ON UPDATE CASCADE`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "job_filters" DROP CONSTRAINT "FK_job_filters_job_id"`);
        await queryRunner.query(`ALTER TABLE "task_run_logs" DROP CONSTRAINT "FK_task_run_logs_run_id"`);
        await queryRunner.query(`ALTER TABLE "application_run_steps" DROP CONSTRAINT "FK_application_run_steps_run_id"`);
        await queryRunner.query(`ALTER TABLE "application_runs" DROP CONSTRAINT "FK_application_runs_job_id"`);
        await queryRunner.query(`ALTER TABLE "applications" DROP CONSTRAINT "FK_applications_job_id"`);
        await queryRunner.query(`ALTER TABLE "job_documents" DROP CONSTRAINT "FK_job_documents_job_id"`);
        await queryRunner.query(`ALTER TABLE "jobs" DROP CONSTRAINT "FK_jobs_company_id"`);
        await queryRunner.query(`DROP INDEX "public"."idx_user_answers_category_created"`);
        await queryRunner.query(`DROP TABLE "user_answers"`);
        await queryRunner.query(`DROP TABLE "user_profile"`);
        await queryRunner.query(`DROP INDEX "public"."idx_task_run_logs_run"`);
        await queryRunner.query(`DROP INDEX "public"."idx_task_run_logs_run_created"`);
        await queryRunner.query(`DROP TABLE "task_run_logs"`);
        await queryRunner.query(`DROP INDEX "public"."idx_task_runs_status"`);
        await queryRunner.query(`DROP INDEX "public"."idx_task_runs_type"`);
        await queryRunner.query(`DROP INDEX "public"."idx_task_runs_dedupe_key"`);
        await queryRunner.query(`DROP INDEX "public"."idx_task_runs_created_at"`);
        await queryRunner.query(`DROP INDEX "public"."idx_task_runs_status_created"`);
        await queryRunner.query(`DROP TABLE "task_runs"`);
        await queryRunner.query(`DROP TABLE "search_config"`);
        await queryRunner.query(`DROP INDEX "public"."idx_job_documents_job_type"`);
        await queryRunner.query(`DROP TABLE "job_documents"`);
        await queryRunner.query(`DROP INDEX "public"."idx_app_run_steps_run"`);
        await queryRunner.query(`DROP INDEX "public"."idx_app_run_steps_run_created"`);
        await queryRunner.query(`DROP TABLE "application_run_steps"`);
        await queryRunner.query(`DROP INDEX "public"."idx_app_runs_job_status"`);
        await queryRunner.query(`DROP INDEX "public"."idx_app_runs_job_created"`);
        await queryRunner.query(`DROP TABLE "application_runs"`);
        await queryRunner.query(`DROP INDEX "public"."idx_applications_score_created"`);
        await queryRunner.query(`DROP INDEX "public"."idx_applications_created_at"`);
        await queryRunner.query(`DROP INDEX "public"."idx_applications_created_desc_id"`);
        await queryRunner.query(`DROP TABLE "applications"`);
        await queryRunner.query(`DROP TABLE "job_filters"`);
        await queryRunner.query(`DROP INDEX "public"."idx_jobs_company_external"`);
        await queryRunner.query(`DROP INDEX "public"."idx_jobs_company"`);
        await queryRunner.query(`DROP INDEX "public"."idx_jobs_status"`);
        await queryRunner.query(`DROP INDEX "public"."idx_jobs_updated_at"`);
        await queryRunner.query(`DROP INDEX "public"."idx_jobs_updated_id"`);
        await queryRunner.query(`DROP INDEX "public"."idx_jobs_status_updated_at"`);
        await queryRunner.query(`DROP INDEX "public"."idx_jobs_status_updated_id"`);
        await queryRunner.query(`DROP INDEX "public"."idx_jobs_company_updated_at"`);
        await queryRunner.query(`DROP INDEX "public"."idx_jobs_company_status_updated"`);
        await queryRunner.query(`DROP TABLE "jobs"`);
        await queryRunner.query(`DROP INDEX "public"."idx_companies_active_slug"`);
        await queryRunner.query(`DROP INDEX "public"."idx_companies_active_ats"`);
        await queryRunner.query(`DROP INDEX "public"."idx_companies_name"`);
        await queryRunner.query(`DROP TABLE "companies"`);
    }

}

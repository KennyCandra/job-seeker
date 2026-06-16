CREATE INDEX IF NOT EXISTS `idx_jobs_updated_at` ON `jobs` (`updated_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_jobs_status_updated_at` ON `jobs` (`status`, `updated_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_jobs_company_updated_at` ON `jobs` (`company_id`, `updated_at`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_job_filters_job_created_at` ON `job_filters` (`job_id`, `created_at`);

CREATE TABLE IF NOT EXISTS `application_runs` (
  `id` text PRIMARY KEY NOT NULL,
  `job_id` text NOT NULL REFERENCES `jobs`(`id`) ON DELETE CASCADE,
  `status` text NOT NULL DEFAULT 'running',
  `profile_path` text NOT NULL DEFAULT '',
  `output_dir` text NOT NULL DEFAULT '',
  `current_url` text NOT NULL DEFAULT '',
  `error` text,
  `summary` text NOT NULL DEFAULT '{}',
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL
);
CREATE INDEX IF NOT EXISTS `idx_app_runs_job_status` ON `application_runs` (`job_id`, `status`);
CREATE TABLE IF NOT EXISTS `application_run_steps` (
  `id` text PRIMARY KEY NOT NULL,
  `run_id` text NOT NULL REFERENCES `application_runs`(`id`) ON DELETE CASCADE,
  `type` text NOT NULL,
  `label` text NOT NULL DEFAULT '',
  `detail` text NOT NULL DEFAULT '',
  `screenshot_path` text,
  `payload` text NOT NULL DEFAULT '{}',
  `created_at` text NOT NULL
);
CREATE INDEX IF NOT EXISTS `idx_app_run_steps_run` ON `application_run_steps` (`run_id`);

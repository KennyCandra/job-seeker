CREATE TABLE `task_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`bull_job_id` text,
	`type` text NOT NULL,
	`status` text NOT NULL DEFAULT 'queued',
	`dedupe_key` text,
	`payload_json` text NOT NULL DEFAULT '{}',
	`progress_json` text,
	`result_json` text,
	`error` text,
	`created_at` text NOT NULL,
	`started_at` text,
	`completed_at` text,
	`updated_at` text NOT NULL
);

CREATE INDEX `idx_task_runs_status` ON `task_runs` (`status`);
CREATE INDEX `idx_task_runs_type` ON `task_runs` (`type`);
CREATE INDEX `idx_task_runs_dedupe_key` ON `task_runs` (`dedupe_key`);

CREATE TABLE `task_run_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL REFERENCES `task_runs`(`id`) ON DELETE CASCADE,
	`level` text NOT NULL DEFAULT 'info',
	`message` text NOT NULL,
	`payload_json` text,
	`created_at` text NOT NULL
);

CREATE INDEX `idx_task_run_logs_run` ON `task_run_logs` (`run_id`);

CREATE TABLE `user_profile` (
	`id` text PRIMARY KEY NOT NULL DEFAULT 'default',
	`full_name` text NOT NULL DEFAULT '',
	`email` text NOT NULL DEFAULT '',
	`phone` text NOT NULL DEFAULT '',
	`location` text NOT NULL DEFAULT '',
	`linkedin` text NOT NULL DEFAULT '',
	`portfolio` text NOT NULL DEFAULT '',
	`github` text NOT NULL DEFAULT '',
	`headline` text NOT NULL DEFAULT '',
	`summary` text NOT NULL DEFAULT '',
	`skills_json` text NOT NULL DEFAULT '[]',
	`experience_json` text NOT NULL DEFAULT '[]',
	`projects_json` text NOT NULL DEFAULT '[]',
	`education_json` text NOT NULL DEFAULT '[]',
	`preferences_json` text NOT NULL DEFAULT '{}',
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);

CREATE TABLE `user_answers` (
	`id` text PRIMARY KEY NOT NULL,
	`category` text NOT NULL DEFAULT '',
	`question` text NOT NULL DEFAULT '',
	`answer` text NOT NULL DEFAULT '',
	`tags_json` text NOT NULL DEFAULT '[]',
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);

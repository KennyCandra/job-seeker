CREATE TABLE IF NOT EXISTS `applications` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`company` text NOT NULL,
	`title` text NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`site` text DEFAULT '' NOT NULL,
	`url` text DEFAULT '' NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'ready' NOT NULL,
	`documents` text DEFAULT '[]' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `applications_job_id_unique` ON `applications` (`job_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `companies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`ats` text NOT NULL,
	`board_url` text NOT NULL,
	`discovered_at` text DEFAULT (datetime('now')) NOT NULL,
	`last_fetched_at` text,
	`active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `companies_slug_unique` ON `companies` (`slug`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `saved_jobs` (
	`company_slug` text NOT NULL,
	`job_id` text NOT NULL,
	`url` text DEFAULT '' NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_saved_jobs_company_job` ON `saved_jobs` (`company_slug`,`job_id`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `search_config` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `shortlist` (
	`job_id` text PRIMARY KEY NOT NULL,
	`company` text NOT NULL,
	`company_slug` text NOT NULL,
	`title` text NOT NULL,
	`location` text NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`verdict` text DEFAULT 'reject' NOT NULL,
	`reasons` text DEFAULT '[]' NOT NULL,
	`must_have_hits` text DEFAULT '[]' NOT NULL,
	`missing_items` text DEFAULT '[]' NOT NULL,
	`apply_url` text DEFAULT '' NOT NULL,
	`filtered_at` text DEFAULT (datetime('now')) NOT NULL
);

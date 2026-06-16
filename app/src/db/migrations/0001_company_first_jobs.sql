PRAGMA foreign_keys = OFF;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `companies_new` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`ats` text NOT NULL,
	`endpoint` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`discovered_at` text DEFAULT (datetime('now')) NOT NULL,
	`last_fetched_at` text,
	`last_successful_fetch_at` text,
	`last_error_at` text,
	`last_error` text,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`updated_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
INSERT OR IGNORE INTO `companies_new` (
	`id`, `name`, `slug`, `ats`, `endpoint`, `active`, `discovered_at`,
	`last_fetched_at`, `last_successful_fetch_at`, `created_at`, `updated_at`
)
SELECT
	`id`,
	`name`,
	`slug`,
	`ats`,
	CASE
		WHEN `ats` = 'greenhouse' THEN 'https://boards-api.greenhouse.io/v1/boards/' || `slug` || '/jobs?content=true'
		WHEN `ats` = 'lever' THEN 'https://api.lever.co/v0/postings/' || `slug` || '?mode=json'
		WHEN `ats` = 'ashby' THEN 'https://api.ashbyhq.com/posting-api/job-board/' || `slug` || '?includeCompensation=true'
		ELSE `board_url`
	END,
	`active`,
	`discovered_at`,
	`last_fetched_at`,
	`last_fetched_at`,
	COALESCE(`discovered_at`, datetime('now')),
	datetime('now')
FROM `companies`;
--> statement-breakpoint
INSERT OR IGNORE INTO `companies_new` (`name`, `slug`, `ats`, `endpoint`, `active`, `discovered_at`, `created_at`, `updated_at`)
SELECT DISTINCT
	`saved_jobs`.`company_slug`,
	`saved_jobs`.`company_slug`,
	'greenhouse',
	'https://boards-api.greenhouse.io/v1/boards/' || `saved_jobs`.`company_slug` || '/jobs?content=true',
	1,
	datetime('now'),
	datetime('now'),
	datetime('now')
FROM `saved_jobs`
WHERE NOT EXISTS (
	SELECT 1 FROM `companies_new` WHERE `companies_new`.`slug` = `saved_jobs`.`company_slug`
);
--> statement-breakpoint
INSERT OR IGNORE INTO `companies_new` (`name`, `slug`, `ats`, `endpoint`, `active`, `discovered_at`, `created_at`, `updated_at`)
SELECT DISTINCT
	`shortlist`.`company`,
	`shortlist`.`company_slug`,
	'greenhouse',
	'https://boards-api.greenhouse.io/v1/boards/' || `shortlist`.`company_slug` || '/jobs?content=true',
	1,
	datetime('now'),
	datetime('now'),
	datetime('now')
FROM `shortlist`
WHERE NOT EXISTS (
	SELECT 1 FROM `companies_new` WHERE `companies_new`.`slug` = `shortlist`.`company_slug`
);
--> statement-breakpoint
DROP TABLE `companies`;
--> statement-breakpoint
ALTER TABLE `companies_new` RENAME TO `companies`;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `companies_slug_unique` ON `companies` (`slug`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`company_id` integer NOT NULL,
	`external_id` text NOT NULL,
	`title` text DEFAULT '' NOT NULL,
	`location` text DEFAULT '' NOT NULL,
	`url` text DEFAULT '' NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`raw_json` text DEFAULT '{}' NOT NULL,
	`content_hash` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`first_seen_at` text NOT NULL,
	`last_seen_at` text NOT NULL,
	`closed_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`company_id`) REFERENCES `companies`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT OR IGNORE INTO `jobs` (
	`id`, `company_id`, `external_id`, `title`, `location`, `url`, `description`,
	`raw_json`, `content_hash`, `status`, `first_seen_at`, `last_seen_at`, `created_at`, `updated_at`
)
SELECT
	CASE
		WHEN `companies`.`ats` = 'greenhouse' AND `saved_jobs`.`job_id` NOT LIKE 'gh-%' THEN 'gh-' || `saved_jobs`.`job_id`
		WHEN `companies`.`ats` = 'lever' AND `saved_jobs`.`job_id` NOT LIKE 'lever-%' THEN 'lever-' || `saved_jobs`.`job_id`
		WHEN `companies`.`ats` = 'ashby' AND `saved_jobs`.`job_id` NOT LIKE 'ashby-%' THEN 'ashby-' || `saved_jobs`.`job_id`
		ELSE `saved_jobs`.`job_id`
	END,
	`companies`.`id`,
	`saved_jobs`.`job_id`,
	COALESCE(`saved_jobs`.`title`, ''),
	COALESCE(`saved_jobs`.`location`, ''),
	COALESCE(`saved_jobs`.`url`, ''),
	COALESCE(`saved_jobs`.`description`, ''),
	'{}',
	hex(randomblob(16)),
	'open',
	COALESCE(`saved_jobs`.`created_at`, datetime('now')),
	COALESCE(`saved_jobs`.`updated_at`, datetime('now')),
	COALESCE(`saved_jobs`.`created_at`, datetime('now')),
	COALESCE(`saved_jobs`.`updated_at`, datetime('now'))
FROM `saved_jobs`
JOIN `companies` ON `companies`.`slug` = `saved_jobs`.`company_slug`;
--> statement-breakpoint
INSERT OR IGNORE INTO `jobs` (
	`id`, `company_id`, `external_id`, `title`, `location`, `url`, `description`,
	`raw_json`, `content_hash`, `status`, `first_seen_at`, `last_seen_at`, `created_at`, `updated_at`
)
SELECT
	`shortlist`.`job_id`,
	`companies`.`id`,
	`shortlist`.`job_id`,
	COALESCE(`shortlist`.`title`, ''),
	COALESCE(`shortlist`.`location`, ''),
	COALESCE(`shortlist`.`apply_url`, ''),
	'',
	'{}',
	hex(randomblob(16)),
	'open',
	COALESCE(`shortlist`.`filtered_at`, datetime('now')),
	COALESCE(`shortlist`.`filtered_at`, datetime('now')),
	COALESCE(`shortlist`.`filtered_at`, datetime('now')),
	datetime('now')
FROM `shortlist`
JOIN `companies` ON `companies`.`slug` = `shortlist`.`company_slug`;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `idx_jobs_company_external` ON `jobs` (`company_id`, `external_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_jobs_company` ON `jobs` (`company_id`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_jobs_status` ON `jobs` (`status`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `job_filters` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`content_hash` text DEFAULT '' NOT NULL,
	`verdict` text DEFAULT 'reject' NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`reasons` text DEFAULT '[]' NOT NULL,
	`must_have_hits` text DEFAULT '[]' NOT NULL,
	`missing_items` text DEFAULT '[]' NOT NULL,
	`model` text DEFAULT '' NOT NULL,
	`prompt_version` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT OR IGNORE INTO `job_filters` (
	`id`, `job_id`, `content_hash`, `verdict`, `score`, `reasons`,
	`must_have_hits`, `missing_items`, `created_at`
)
SELECT
	`shortlist`.`job_id` || '-' || replace(COALESCE(`shortlist`.`filtered_at`, datetime('now')), ':', '-'),
	`shortlist`.`job_id`,
	COALESCE(`jobs`.`content_hash`, ''),
	`shortlist`.`verdict`,
	`shortlist`.`score`,
	`shortlist`.`reasons`,
	`shortlist`.`must_have_hits`,
	`shortlist`.`missing_items`,
	COALESCE(`shortlist`.`filtered_at`, datetime('now'))
FROM `shortlist`
JOIN `jobs` ON `jobs`.`id` = `shortlist`.`job_id`;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_job_filters_job_hash` ON `job_filters` (`job_id`, `content_hash`);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_job_filters_score` ON `job_filters` (`score`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `applications_new` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`status` text DEFAULT 'ready' NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`documents` text DEFAULT '[]' NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT OR IGNORE INTO `applications_new` (
	`id`, `job_id`, `status`, `score`, `documents`, `created_at`, `updated_at`
)
SELECT
	`applications`.`id`,
	`applications`.`job_id`,
	`applications`.`status`,
	`applications`.`score`,
	`applications`.`documents`,
	`applications`.`created_at`,
	`applications`.`updated_at`
FROM `applications`
JOIN `jobs` ON `jobs`.`id` = `applications`.`job_id`;
--> statement-breakpoint
DROP TABLE `applications`;
--> statement-breakpoint
ALTER TABLE `applications_new` RENAME TO `applications`;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `applications_job_id_unique` ON `applications` (`job_id`);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `job_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`type` text NOT NULL,
	`status` text DEFAULT 'ready' NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`file_path` text DEFAULT '' NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`created_by` text DEFAULT 'system' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`job_id`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `idx_job_documents_job_type` ON `job_documents` (`job_id`, `type`);
--> statement-breakpoint
DROP TABLE IF EXISTS `saved_jobs`;
--> statement-breakpoint
DROP TABLE IF EXISTS `shortlist`;
--> statement-breakpoint
PRAGMA foreign_keys = ON;

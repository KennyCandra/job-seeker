import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const applications = sqliteTable("applications", {
  id: text("id").primaryKey(),
  jobId: text("job_id").notNull().unique(),
  company: text("company").notNull(),
  title: text("title").notNull(),
  location: text("location").notNull().default(""),
  site: text("site").notNull().default(""),
  url: text("url").notNull().default(""),
  score: integer("score").notNull().default(0),
  status: text("status").notNull().default("ready"),
  documents: text("documents").notNull().default("[]"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const companies = sqliteTable("companies", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  ats: text("ats").notNull(),
  boardUrl: text("board_url").notNull(),
  discoveredAt: text("discovered_at").notNull().default(sql`(datetime('now'))`),
  lastFetchedAt: text("last_fetched_at"),
  active: integer("active").notNull().default(1),
});

export const shortlist = sqliteTable("shortlist", {
  jobId: text("job_id").primaryKey(),
  company: text("company").notNull(),
  companySlug: text("company_slug").notNull(),
  title: text("title").notNull(),
  location: text("location").notNull(),
  score: integer("score").notNull().default(0),
  verdict: text("verdict").notNull().default("reject"),
  reasons: text("reasons").notNull().default("[]"),
  mustHaveHits: text("must_have_hits").notNull().default("[]"),
  missingItems: text("missing_items").notNull().default("[]"),
  applyUrl: text("apply_url").notNull().default(""),
  filteredAt: text("filtered_at").notNull().default(sql`(datetime('now'))`),
});

export const searchConfig = sqliteTable("search_config", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

export const savedJobs = sqliteTable("saved_jobs", {
  companySlug: text("company_slug").notNull(),
  jobId: text("job_id").notNull(),
  url: text("url").notNull().default(""),
  title: text("title").notNull().default(""),
  location: text("location").notNull().default(""),
  description: text("description").notNull().default(""),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (t) => ({
  uniqCompanyJob: uniqueIndex("idx_saved_jobs_company_job").on(t.companySlug, t.jobId),
}));

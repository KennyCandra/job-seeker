import { index, integer, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { companies } from "./companies";

export const jobs = pgTable("jobs", {
  id: text("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  externalId: text("external_id").notNull(),
  title: text("title").notNull().default(""),
  location: text("location").notNull().default(""),
  url: text("url").notNull().default(""),
  description: text("description").notNull().default(""),
  rawJson: text("raw_json").notNull().default("{}"),
  contentHash: text("content_hash").notNull().default(""),
  status: text("status").notNull().default("open"),
  firstSeenAt: text("first_seen_at").notNull(),
  lastSeenAt: text("last_seen_at").notNull(),
  closedAt: text("closed_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
}, (t) => ({
  uniqCompanyExternal: uniqueIndex("idx_jobs_company_external").on(t.companyId, t.externalId),
  companyIdx: index("idx_jobs_company").on(t.companyId),
  statusIdx: index("idx_jobs_status").on(t.status),
  updatedAtIdx: index("idx_jobs_updated_at").on(t.updatedAt),
  updatedIdIdx: index("idx_jobs_updated_id").on(t.updatedAt, t.id),
  statusUpdatedAtIdx: index("idx_jobs_status_updated_at").on(t.status, t.updatedAt),
  statusUpdatedIdIdx: index("idx_jobs_status_updated_id").on(t.status, t.updatedAt, t.id),
  companyUpdatedAtIdx: index("idx_jobs_company_updated_at").on(t.companyId, t.updatedAt),
  companyStatusUpdatedIdx: index("idx_jobs_company_status_updated").on(t.companyId, t.status, t.updatedAt),
}));

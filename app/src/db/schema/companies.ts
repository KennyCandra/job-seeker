import { index, integer, pgTable, serial, text } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  ats: text("ats").notNull(),
  endpoint: text("endpoint").notNull(),
  active: integer("active").notNull().default(1),
  discoveredAt: text("discovered_at").notNull().default(sql`now()::text`),
  lastFetchedAt: text("last_fetched_at"),
  lastSuccessfulFetchAt: text("last_successful_fetch_at"),
  lastErrorAt: text("last_error_at"),
  lastError: text("last_error"),
  createdAt: text("created_at").notNull().default(sql`now()::text`),
  updatedAt: text("updated_at").notNull().default(sql`now()::text`),
}, (t) => ({
  activeSlugIdx: index("idx_companies_active_slug").on(t.active, t.slug),
  activeAtsIdx: index("idx_companies_active_ats").on(t.active, t.ats),
  nameIdx: index("idx_companies_name").on(t.name),
}));

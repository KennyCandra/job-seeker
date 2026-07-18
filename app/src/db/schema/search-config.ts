import { pgTable, text } from "drizzle-orm/pg-core";

export const searchConfig = pgTable("search_config", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

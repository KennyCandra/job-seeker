import { migrate as drizzleMigrate } from "drizzle-orm/bun-sqlite/migrator";
import type { DrizzleDb } from "./connection";

export function migrate(db: DrizzleDb): void {
  drizzleMigrate(db, { migrationsFolder: "./app/src/db/migrations" });
}

import { migrate as drizzleMigrate } from "drizzle-orm/postgres-js/migrator";
import type { DrizzleDb } from "./connection";

export async function migrate(db: DrizzleDb): Promise<void> {
  await drizzleMigrate(db, { migrationsFolder: "./app/src/db/migrations" });
}

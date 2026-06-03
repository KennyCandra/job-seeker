import { Database as SqliteDb } from "bun:sqlite";
import { drizzle, type BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import { migrate } from "./migrate";
import * as schema from "./schema";

const APP_ROOT = join(import.meta.dir, "..", "..", "..");

export type DrizzleDb = BunSQLiteDatabase<typeof schema>;

export type DbOptions = {
  path?: string;
  enableWal?: boolean;
};

export function createConnection(options: DbOptions = {}): DrizzleDb {
  const dbPath = options.path || process.env.DATABASE_PATH || join(APP_ROOT, "data", "cv-autopilot.db");
  const dir = join(dbPath, "..");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const raw = new SqliteDb(dbPath);
  if (options.enableWal !== false) raw.exec("PRAGMA journal_mode = WAL");
  return drizzle(raw, { schema });
}

export function createDatabase(options: DbOptions = {}): DrizzleDb {
  const d = createConnection(options);
  migrate(d);
  return d;
}

let _defaultDb: DrizzleDb | null = null;

export function getDb(): DrizzleDb {
  if (!_defaultDb) _defaultDb = createDatabase();
  return _defaultDb;
}

export function resetDb(): void {
  if (_defaultDb) {
    const raw = (_defaultDb as any).session?.session?.db;
    if (raw?.close) raw.close();
    _defaultDb = null;
  }
}

export const db = new Proxy({} as DrizzleDb, {
  get(_target, prop) {
    return (getDb() as any)[prop];
  },
});

export type { Database } from "bun:sqlite";

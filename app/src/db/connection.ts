import postgres from "postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

const DEFAULT_DATABASE_URL = "postgres://cv_autopilot:cv_autopilot@localhost:5432/cv_autopilot";

export type DrizzleDb = PostgresJsDatabase<typeof schema>;

export type DbOptions = {
  url?: string;
};

let _sql: postgres.Sql | null = null;
let _defaultDb: DrizzleDb | null = null;

export function createConnection(options: DbOptions = {}): DrizzleDb {
  const url = options.url || process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
  _sql = postgres(url, { max: Number(process.env.DATABASE_POOL_SIZE || 10) });
  return drizzle(_sql, { schema });
}

export function createDatabase(options: DbOptions = {}): DrizzleDb {
  return createConnection(options);
}

export function getDb(): DrizzleDb {
  if (!_defaultDb) _defaultDb = createDatabase();
  return _defaultDb;
}

export function getSql(): postgres.Sql {
  if (!_sql) getDb();
  return _sql!;
}

export async function resetDb(): Promise<void> {
  if (_sql) {
    await _sql.end({ timeout: 5 });
    _sql = null;
  }
  _defaultDb = null;
}

export const db = new Proxy({} as DrizzleDb, {
  get(_target, prop) {
    return (getDb() as any)[prop];
  },
});

import { eq } from "drizzle-orm";
import { Repository } from "../repository";
import { searchConfig } from "../schema";

export class SearchConfigRepository extends Repository {
  getAll(): Record<string, string> {
    const rows = this.db.select().from(searchConfig).all() as Array<{ key: string; value: string }>;
    const config: Record<string, string> = {};
    for (const row of rows) config[row.key] = row.value;
    return config;
  }

  get(key: string): string | undefined {
    const row = this.db.select({ value: searchConfig.value }).from(searchConfig).where(eq(searchConfig.key, key)).get() as { value: string } | undefined;
    return row?.value;
  }

  getJson<T = unknown>(key: string, fallback: T): T {
    const raw = this.get(key);
    if (!raw) return fallback;
    try { return JSON.parse(raw) as T; } catch { return fallback; }
  }

  set(key: string, value: string): void {
    this.db.insert(searchConfig).values({ key, value })
      .onConflictDoUpdate({ target: searchConfig.key, set: { value } })
      .run();
  }

  setJson(key: string, value: unknown): void {
    this.set(key, JSON.stringify(value));
  }

  delete(key: string): void {
    this.db.delete(searchConfig).where(eq(searchConfig.key, key)).run();
  }

  clear(): void {
    this.db.delete(searchConfig).run();
  }
}

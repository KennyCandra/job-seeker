import { eq } from "drizzle-orm";
import { Repository } from "../repository";
import { searchConfig } from "../schema";

export class SearchConfigRepository extends Repository {
  async getAll(): Promise<Record<string, string>> {
    const rows = await this.db.select().from(searchConfig) as Array<{ key: string; value: string }>;
    const config: Record<string, string> = {};
    for (const row of rows) config[row.key] = row.value;
    return config;
  }

  async get(key: string): Promise<string | undefined> {
    const [row] = await this.db.select({ value: searchConfig.value }).from(searchConfig).where(eq(searchConfig.key, key)).limit(1) as Array<{ value: string }>;
    return row?.value;
  }

  async getJson<T = unknown>(key: string, fallback: T): Promise<T> {
    const raw = await this.get(key);
    if (!raw) return fallback;
    try { return JSON.parse(raw) as T; } catch { return fallback; }
  }

  async set(key: string, value: string): Promise<void> {
    await this.db.insert(searchConfig).values({ key, value })
      .onConflictDoUpdate({ target: searchConfig.key, set: { value } });
  }

  async setJson(key: string, value: unknown): Promise<void> {
    await this.set(key, JSON.stringify(value));
  }

  async delete(key: string): Promise<void> {
    await this.db.delete(searchConfig).where(eq(searchConfig.key, key));
  }

  async clear(): Promise<void> {
    await this.db.delete(searchConfig);
  }
}

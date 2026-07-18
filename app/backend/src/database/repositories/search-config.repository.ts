import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";

@Injectable()
export class SearchConfigRepository {
  constructor(private readonly dataSource: DataSource) {}

  async getJson<T>(key: string, fallback: T): Promise<T> {
    const rows = await this.dataSource.query(`SELECT value FROM search_config WHERE key = $1 LIMIT 1`, [key]);
    if (!rows[0]) return fallback;
    try {
      return JSON.parse(rows[0].value) as T;
    } catch {
      return fallback;
    }
  }

  async setJson(key: string, value: unknown): Promise<void> {
    await this.dataSource.query(
      `INSERT INTO search_config (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [key, JSON.stringify(value)],
    );
  }

  async getDefault(key = "default"): Promise<{ key: string; value: string } | undefined> {
    const rows = await this.dataSource.query(`SELECT key, value FROM search_config WHERE key = $1 LIMIT 1`, [key]);
    return rows[0] ? { key: rows[0].key, value: rows[0].value } : undefined;
  }

  async save(key: string, value: string): Promise<void> {
    await this.setJson(key, value);
  }
}

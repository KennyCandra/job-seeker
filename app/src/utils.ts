import { parse } from "csv-parse/sync";
import { readFileSync, mkdirSync, writeFileSync } from "fs";
import { dirname } from "path";
import type { JobRecord } from "./types";

export function readText(path: string): string {
  return readFileSync(path, "utf-8");
}

export function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

export function writeJson(path: string, data: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2), "utf-8");
}

export function writeText(path: string, data: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, data, "utf-8");
}

export function parseJobsCsv(path: string): JobRecord[] {
  const raw = readFileSync(path, "utf-8");
  const records = parse(raw, {
    columns: true,
    skip_empty_lines: true,
  }) as Record<string, string>[];

  return records.map((row, index) => ({
    id: row.id || `${row.site || "job"}-${index}`,
    site: row.site || "",
    title: row.title || "",
    company: row.company || "",
    location: row.location || "",
    url: row.url || "",
    description: row.description || "",
    posted_at: row.date_posted || row.posted_at || "",
  }));
}

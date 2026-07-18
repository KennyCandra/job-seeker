import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";

export function readText(path: string): string {
  return readFileSync(path, "utf-8");
}

export function writeText(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, "utf-8");
}

export function writeJson(path: string, data: unknown): void {
  writeText(path, JSON.stringify(data, null, 2));
}

export function readJson<T>(path: string, fallback: T): T {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf-8")) as T;
  } catch {
    return fallback;
  }
}

function dirname(p: string): string {
  const i = p.lastIndexOf("/");
  return i === -1 ? "." : p.slice(0, i);
}

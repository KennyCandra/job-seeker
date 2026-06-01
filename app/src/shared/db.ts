import { Database } from "bun:sqlite";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import type { AtsPlatform, ShortlistItem } from "./types";
import { slug, boardUrlForAts } from "./index";

const APP_ROOT = join(import.meta.dir, "..", "..", "..");

function initDb(): Database {
  const dbPath = process.env.DATABASE_PATH || join(APP_ROOT, "data", "cv-autopilot.db");
  const dir = join(dbPath, "..");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const d = new Database(dbPath);
  d.exec("PRAGMA journal_mode = WAL");
  return d;
}

export const db = initDb();
migrate();

function migrate() {
  db.run(`CREATE TABLE IF NOT EXISTS seen_jobs (
    key TEXT PRIMARY KEY,
    first_seen TEXT NOT NULL,
    last_seen TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY,
    job_id TEXT NOT NULL UNIQUE,
    company TEXT NOT NULL,
    title TEXT NOT NULL,
    location TEXT NOT NULL DEFAULT '',
    site TEXT NOT NULL DEFAULT '',
    url TEXT NOT NULL DEFAULT '',
    score INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'ready',
    documents TEXT NOT NULL DEFAULT '[]',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS companies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    ats TEXT NOT NULL,
    board_url TEXT NOT NULL,
    discovered_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_fetched_at TEXT,
    active INTEGER NOT NULL DEFAULT 1
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS shortlist (
    job_id TEXT PRIMARY KEY,
    company TEXT NOT NULL,
    company_slug TEXT NOT NULL,
    title TEXT NOT NULL,
    location TEXT NOT NULL,
    score INTEGER NOT NULL DEFAULT 0,
    verdict TEXT NOT NULL DEFAULT 'reject',
    reasons TEXT NOT NULL DEFAULT '[]',
    must_have_hits TEXT NOT NULL DEFAULT '[]',
    missing_items TEXT NOT NULL DEFAULT '[]',
    apply_url TEXT NOT NULL DEFAULT '',
    filtered_at TEXT NOT NULL DEFAULT (datetime('now'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS search_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`);
}

export function isJobSeen(title: string, company: string): boolean {
  const key = `${title.toLowerCase().trim()}|${company.toLowerCase().trim()}`;
  const row = db.query("SELECT 1 FROM seen_jobs WHERE key = ?").get(key);
  return !!row;
}

export function markJobSeen(title: string, company: string): void {
  const key = `${title.toLowerCase().trim()}|${company.toLowerCase().trim()}`;
  const now = new Date().toISOString();
  db.run(
    "INSERT INTO seen_jobs (key, first_seen, last_seen) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET last_seen = ?",
    [key, now, now, now],
  );
}

export function countNewJobs(jobs: Array<{ title: string; company: string }>): number {
  return jobs.filter((j) => !isJobSeen(j.title, j.company)).length;
}

export function saveAcceptedJob(
  jobId: string,
  company: string,
  title: string,
  location: string,
  site: string,
  url: string,
  score: number,
): void {
  const now = new Date().toISOString();
  const id = `${slug(company)}-${slug(title)}-${Date.now()}`;
  db.run(
    `INSERT INTO applications (id, job_id, company, title, location, site, url, score, documents, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, '[]', ?, ?)
     ON CONFLICT(job_id) DO UPDATE SET score = ?, updated_at = ?`,
    [id, jobId, company, title, location, site, url, score, now, now, score, now],
  );
}

export function getRecentJobs(limit = 20) {
  return db
    .query(
      "SELECT job_id as id, company, title, location, site, url, '' as description, created_at as posted_at FROM applications ORDER BY created_at DESC LIMIT ?",
    )
    .all(limit) as Array<{
    id: string;
    company: string;
    title: string;
    location: string;
    site: string;
    url: string;
    description: string;
    posted_at: string;
  }>;
}

export function getApplications() {
  return db
    .query(
      "SELECT id, job_id, company, title, location, site, url, score, status, documents, created_at, updated_at FROM applications ORDER BY score DESC, created_at DESC",
    )
    .all() as Array<{
    id: string;
    job_id: string;
    company: string;
    title: string;
    location: string;
    site: string;
    url: string;
    score: number;
    status: string;
    documents: string;
    created_at: string;
    updated_at: string;
  }>;
}

export function updateApplicationStatus(jobId: string, status: string): void {
  const now = new Date().toISOString();
  db.run("UPDATE applications SET status = ?, updated_at = ? WHERE job_id = ?", [status, now, jobId]);
}

export function getApplicationByJobId(jobId: string) {
  return db
    .query("SELECT * FROM applications WHERE job_id = ?")
    .get(jobId) as {
    id: string;
    job_id: string;
    company: string;
    title: string;
    location: string;
    site: string;
    url: string;
    score: number;
    status: string;
    documents: string;
    created_at: string;
    updated_at: string;
  } | undefined;
}

export function getActiveCompanies() {
  return db.query("SELECT * FROM companies WHERE active = 1 ORDER BY slug").all() as Array<{
    id: number;
    slug: string;
    name: string;
    ats: string;
    board_url: string;
    discovered_at: string;
    last_fetched_at: string | null;
    active: number;
  }>;
}

export function getCompanyBySlug(slug: string) {
  return db.query("SELECT * FROM companies WHERE slug = ?").get(slug) as {
    id: number;
    slug: string;
    name: string;
    ats: string;
    board_url: string;
    discovered_at: string;
    last_fetched_at: string | null;
    active: number;
  } | undefined;
}

export function saveCompany(slug: string, name: string, ats: AtsPlatform, boardUrl: string): void {
  db.run(
    "INSERT OR IGNORE INTO companies (slug, name, ats, board_url) VALUES (?, ?, ?, ?)",
    [slug, name, ats, boardUrl],
  );
}

export function updateCompanyFetchedAt(slug: string): void {
  db.run("UPDATE companies SET last_fetched_at = datetime('now') WHERE slug = ?", [slug]);
}

export function deactivateCompany(slug: string): void {
  db.run("UPDATE companies SET active = 0 WHERE slug = ?", [slug]);
}

export function updateCompanyAts(slug: string, ats: AtsPlatform, boardUrl: string): void {
  db.run("UPDATE companies SET ats = ?, board_url = ? WHERE slug = ?", [ats, boardUrl, slug]);
}

export function getCompaniesCountPerAts() {
  return db.query(
    "SELECT ats, COUNT(*) as count FROM companies WHERE active = 1 GROUP BY ats ORDER BY ats",
  ).all() as Array<{ ats: string; count: number }>;
}

export function getShortlist(): ShortlistItem[] {
  const rows = db.query(
    "SELECT * FROM shortlist ORDER BY score DESC, filtered_at DESC",
  ).all() as any[];
  return rows.map((r) => ({
    jobId: r.job_id,
    company: r.company,
    companySlug: r.company_slug,
    title: r.title,
    location: r.location,
    score: r.score,
    verdict: r.verdict,
    reasons: JSON.parse(r.reasons || "[]"),
    mustHaveHits: JSON.parse(r.must_have_hits || "[]"),
    missingItems: JSON.parse(r.missing_items || "[]"),
    applyUrl: r.apply_url,
    filteredAt: r.filtered_at,
  }));
}

export function saveShortlist(items: ShortlistItem[]): void {
  const insert = db.prepare(
    `INSERT OR REPLACE INTO shortlist
     (job_id, company, company_slug, title, location, score, verdict, reasons, must_have_hits, missing_items, apply_url, filtered_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const now = new Date().toISOString();
  for (const item of items) {
    insert.run(
      item.jobId, item.company, item.companySlug, item.title, item.location,
      item.score, item.verdict, JSON.stringify(item.reasons),
      JSON.stringify(item.mustHaveHits), JSON.stringify(item.missingItems),
      item.applyUrl, now,
    );
  }
}

export function clearShortlist(): void {
  db.run("DELETE FROM shortlist");
}

export function getSearchConfig(): Record<string, string> {
  const rows = db.query("SELECT key, value FROM search_config").all() as Array<{ key: string; value: string }>;
  const config: Record<string, string> = {};
  for (const row of rows) {
    config[row.key] = row.value;
  }
  return config;
}

export function saveSearchConfig(key: string, value: string): void {
  db.run(
    "INSERT OR REPLACE INTO search_config (key, value) VALUES (?, ?)",
    [key, value],
  );
}

export function seedCompanies(companies: Array<{ slug: string; name: string; ats: AtsPlatform }>): number {
  let count = 0;
  for (const c of companies) {
    const boardUrl = boardUrlForAts(c.slug, c.ats);
    const existing = getCompanyBySlug(c.slug);
    if (!existing) {
      saveCompany(c.slug, c.name, c.ats, boardUrl);
      count++;
    }
  }
  return count;
}



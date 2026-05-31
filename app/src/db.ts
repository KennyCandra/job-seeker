import { Database } from "bun:sqlite";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";

function initDb(): Database {
  const dbPath = process.env.DATABASE_PATH || join(import.meta.dir, "..", "data", "cv-autopilot.db");
  const dir = join(dbPath, "..");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const d = new Database(dbPath);
  d.exec("PRAGMA journal_mode = WAL");
  return d;
}

const db = initDb();
migrate();

function migrate() {
  db.run(`
    CREATE TABLE IF NOT EXISTS seen_jobs (
      key TEXT PRIMARY KEY,
      first_seen TEXT NOT NULL,
      last_seen TEXT NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS applications (
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
    )
  `);
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
      "SELECT id, job_id, company, title, location, score, status, documents, created_at, updated_at FROM applications ORDER BY score DESC, created_at DESC",
    )
    .all() as Array<{
    id: string;
    job_id: string;
    company: string;
    title: string;
    location: string;
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

function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

import { join, resolve, sep } from "path";
import { existsSync } from "fs";

// __dirname is either .../app/backend/src/common (dev, ts-node/bun) or
// .../app/backend/dist/common (built). Both are 2 levels under app/backend,
// so both need exactly 4 "up"s to reach the repo root.
function findRepoRoot(start: string): string {
  let dir = start;
  for (let i = 0; i < 8; i++) {
    if (existsSync(join(dir, "docker-compose.yml")) && existsSync(join(dir, "app"))) return dir;
    const parent = resolve(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  // Fall back to the fixed-depth calculation if the marker isn't found
  // (e.g. docker-compose.yml renamed/moved) so paths never silently break.
  return resolve(start, "..", "..", "..", "..");
}

export const APP_ROOT = findRepoRoot(__dirname);
export const DATA_DIR = process.env.DATA_DIR ? resolve(process.env.DATA_DIR) : join(APP_ROOT, "data");
export const OUTPUT_DIR = join(APP_ROOT, "output");
export const SKILLS_DIR = process.env.SKILLS_DIR ? resolve(process.env.SKILLS_DIR) : join(APP_ROOT, "app", "skills");
export const JOBS_DIR = join(DATA_DIR, "jobs");
export const FRONTEND_DIST = process.env.FRONTEND_DIST
  ? resolve(process.env.FRONTEND_DIST)
  : join(APP_ROOT, "app", "frontend", "dist");
export const TEMPLATES_DIR = process.env.TEMPLATES_DIR ? resolve(process.env.TEMPLATES_DIR) : join(APP_ROOT, "templates");

export function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function boardUrlForAts(s: string, ats: string): string {
  switch (ats) {
    case "greenhouse":
      return `https://boards.greenhouse.io/${s}`;
    case "lever":
      return `https://jobs.lever.co/${s}`;
    case "ashby":
      return `https://jobs.ashbyhq.com/${s}`;
    case "custom":
    default:
      return "manual";
  }
}

export function endpointForAts(s: string, ats: string): string {
  switch (ats) {
    case "greenhouse":
      return `https://boards-api.greenhouse.io/v1/boards/${s}/jobs?content=true`;
    case "lever":
      return `https://api.lever.co/v0/postings/${s}?mode=json`;
    case "ashby":
      return `https://api.ashbyhq.com/posting-api/job-board/${s}?includeCompensation=true`;
    case "custom":
    default:
      return "manual";
  }
}

export function jobDirForCompany(companySlug: string): string {
  return join(JOBS_DIR, slug(companySlug));
}

export function resolveContainedPath(baseDir: string, relativePath: string): string | null {
  const resolved = resolve(baseDir, relativePath);
  const base = resolve(baseDir);
  if (resolved !== base && !resolved.startsWith(base + sep)) {
    return null;
  }
  return resolved;
}

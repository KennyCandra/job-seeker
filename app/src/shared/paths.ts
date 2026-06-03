import { join } from "path";
import type { AtsPlatform, JobRecord } from "./types";

export const APP_ROOT = join(import.meta.dir, "..", "..", "..");
export const DATA_DIR = join(APP_ROOT, "data");
export const OUTPUT_DIR = join(APP_ROOT, "output");
export const SKILLS_DIR = join(APP_ROOT, "app", "skills");
export const JOBS_DIR = join(DATA_DIR, "jobs");

export function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function boardUrlForAts(slug: string, ats: AtsPlatform): string {
  switch (ats) {
    case "greenhouse": return `https://boards.greenhouse.io/${slug}`;
    case "lever": return `https://jobs.lever.co/${slug}`;
    case "ashby": return `https://jobs.ashbyhq.com/${slug}`;
  }
}

export function jobDir(job: JobRecord): string {
  return join(JOBS_DIR, slug(job.company));
}

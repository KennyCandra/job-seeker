import { spawn } from "child_process";
import { join } from "path";
import type { JobRecord } from "./types.ts";

const APP_ROOT = join(import.meta.dir, "..");
const PROJECT_ROOT = join(import.meta.dir, "..", "..");

export async function fetchViaJobSpy(params: {
  search: string;
  location: string;
  num: string;
  hours: string;
  sites?: string[];
}): Promise<JobRecord[]> {
  const { search, location, num, hours, sites } = params;
  console.log(`Fetching jobs via JobSpy: "${search}" in "${location}"...`);

  const csvPath = join(APP_ROOT, "data", "jobs.csv");
  const sitesArg = sites ? `-s ${sites.join(" ")}` : "";
  const command = `./venv/bin/python jobsearch.py "${search}" "${location}" -n ${num} -o ${hours} -f "${csvPath}" ${sitesArg}`;

  try {
    await runCommand(command, PROJECT_ROOT);
  } catch (err: any) {
    console.warn(`JobSpy failed: ${err.message}`);
    return [];
  }

  const { parse } = await import("csv-parse/sync");
  const { readFileSync, existsSync } = await import("fs");
  if (!existsSync(csvPath)) {
    console.warn("JobSpy CSV not found — no jobs fetched");
    return [];
  }
  const raw = readFileSync(csvPath, "utf-8");
  const records = parse(raw, { columns: true, skip_empty_lines: true }) as Record<string, string>[];

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

function runCommand(commandLine: string, cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(commandLine, { cwd, stdio: "inherit", shell: true });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command failed (${code}): ${commandLine}`));
    });
    child.on("error", (err) => reject(err));
  });
}

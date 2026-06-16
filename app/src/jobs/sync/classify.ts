import { createHash } from "crypto";
import type { JobRecord, JobRow } from "../../shared/types";
import type { NormalizedJobInput, JobSyncResult, CompanyFetchResult } from "./types";
import { jobs as jobsRepo } from "../../db";

export function computeContentHash(input: { title: string; location: string; url: string; description: string; rawJson: unknown }): string {
  const rawJson = typeof input.rawJson === "string" ? input.rawJson : JSON.stringify(input.rawJson ?? {});
  return createHash("sha256")
    .update(JSON.stringify({
      title: input.title,
      location: input.location,
      url: input.url,
      description: input.description,
      rawJson,
    }))
    .digest("hex");
}

export function classifyJobs(
  companyId: number,
  companySlug: string,
  companyName: string,
  ats: string,
  incoming: NormalizedJobInput[],
): JobSyncResult {
  const existingJobs = jobsRepo.instance.getByCompanyId(companyId);
  const existingByExternalId = new Map(existingJobs.map((j) => [j.externalId, j]));

  const seenExternalIds = new Set<string>();
  const newJobs: JobRecord[] = [];
  const changedJobs: JobRecord[] = [];
  const unchangedJobs: JobRecord[] = [];

  for (const job of incoming) {
    const contentHash = computeContentHash(job);
    seenExternalIds.add(job.externalId);

    const existing = existingByExternalId.get(job.externalId);

    if (!existing) {
      newJobs.push(toJobRecord(job, companyName));
    } else if (existing.contentHash !== contentHash) {
      changedJobs.push(toJobRecord(job, companyName));
    } else {
      unchangedJobs.push(toJobRecord(job, companyName));
    }
  }

  const closedJobs: JobRecord[] = [];
  for (const existing of existingJobs) {
    if (!seenExternalIds.has(existing.externalId) && existing.status === "open") {
      closedJobs.push(toJobRecordFromRow(existing));
    }
  }

  const companyResult: CompanyFetchResult = {
    companyId,
    companySlug,
    companyName,
    ats: ats as any,
    fetched: incoming.length,
    newCount: newJobs.length,
    changedCount: changedJobs.length,
    unchangedCount: unchangedJobs.length,
    closedCount: closedJobs.length,
  };

  return {
    newJobs,
    changedJobs,
    unchangedJobs,
    closedJobs,
    companyResults: [companyResult],
  };
}

function toJobRecord(input: NormalizedJobInput, companyName: string): JobRecord {
  return {
    id: input.id,
    site: input.id.split("-")[0] || "unknown",
    title: input.title,
    company: companyName,
    location: input.location,
    url: input.url,
    description: input.description,
  };
}

function toJobRecordFromRow(row: JobRow): JobRecord {
  return {
    id: row.id,
    site: row.id.split("-")[0] || "unknown",
    title: row.title,
    company: (row as any).companyName || row.externalId,
    location: row.location,
    url: row.url,
    description: row.description,
  };
}

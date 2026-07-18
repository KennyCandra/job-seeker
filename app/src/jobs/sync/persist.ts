import { jobs } from "../../db";
import type { JobRecord } from "../../shared/types";

export async function persistSyncResult(
  newJobs: JobRecord[],
  changedJobs: JobRecord[],
  unchangedJobs: JobRecord[],
  companyId: number,
  rawDataByJobId: Map<string, unknown>,
): Promise<void> {
  const now = new Date().toISOString();

  const seenExternalIds: string[] = [];

  for (const job of newJobs) {
    const row = toRow(job, companyId, "open", rawDataByJobId.get(job.id));
    await jobs.instance.save(row);
    seenExternalIds.push(row.externalId as string);
  }

  for (const job of changedJobs) {
    const row = toRow(job, companyId, "open", rawDataByJobId.get(job.id));
    await jobs.instance.save(row);
    seenExternalIds.push(row.externalId as string);
  }

  for (const job of unchangedJobs) {
    await jobs.instance.updateLastSeen(job.id, now);
    const externalId = extractExternalId(job);
    if (externalId) seenExternalIds.push(externalId);
  }

  console.log(unchangedJobs , changedJobs)

  await jobs.instance.markClosedMissing(companyId, seenExternalIds);
}

function toRow(job: JobRecord, companyId: number, status: string, rawJson?: unknown): any {
  const externalId = extractExternalId(job);
  return {
    id: job.id,
    companyId,
    externalId,
    url: job.url,
    title: job.title,
    location: job.location,
    description: job.description,
    rawJson: rawJson ?? {},
    status,
  };
}

function extractExternalId(job: JobRecord): string {
  if (job.id.startsWith("gh-")) return job.id.slice(3);
  if (job.id.startsWith("lever-")) return job.id.slice(6);
  if (job.id.startsWith("ashby-")) return job.id.slice(6);
  return job.id;
}

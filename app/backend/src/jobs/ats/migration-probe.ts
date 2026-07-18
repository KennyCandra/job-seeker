import { endpointForAts } from "../../common/paths";
import type { AtsPlatform } from "../../shared/types";
import type { RawJob } from "./types";

export type MigrationMatch = {
  ats: Exclude<AtsPlatform, "custom">;
  endpoint: string;
  rawJobs: RawJob[];
};

const PROBE_TIMEOUT_MS = 15000;
const CANDIDATE_ATS = ["greenhouse", "lever", "ashby"] as const;

async function probeFetch(url: string, init?: RequestInit): Promise<Response | null> {
  try {
    return await fetch(url, { ...init, signal: AbortSignal.timeout(PROBE_TIMEOUT_MS) });
  } catch {
    return null;
  }
}

async function tryGreenhouse(companySlug: string): Promise<MigrationMatch | null> {
  const endpoint = endpointForAts(companySlug, "greenhouse");
  const res = await probeFetch(endpoint);
  if (!res || !res.ok) return null;
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return null;
  }
  const jobs = (body as any)?.jobs;
  if (!Array.isArray(jobs)) return null;
  return { ats: "greenhouse", endpoint, rawJobs: jobs.map((raw: any) => ({ id: String(raw.id), raw })) };
}

async function tryLever(companySlug: string): Promise<MigrationMatch | null> {
  const endpoint = endpointForAts(companySlug, "lever");
  const res = await probeFetch(endpoint);
  if (!res || !res.ok) return null;
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return null;
  }
  if (!Array.isArray(body)) return null;
  return { ats: "lever", endpoint, rawJobs: body.map((raw: any) => ({ id: String(raw.id), raw })) };
}

async function tryAshby(companySlug: string): Promise<MigrationMatch | null> {
  const endpoint = endpointForAts(companySlug, "ashby");
  const res = await probeFetch(endpoint);
  if (!res || !res.ok) return null;
  let body: unknown;
  try {
    body = await res.json();
  } catch {
    return null;
  }
  const jobs = (body as any)?.jobs;
  if (!Array.isArray(jobs)) return null;
  return { ats: "ashby", endpoint, rawJobs: jobs.map((raw: any) => ({ id: String(raw.id), raw })) };
}

const PROBES: Record<(typeof CANDIDATE_ATS)[number], (companySlug: string) => Promise<MigrationMatch | null>> = {
  greenhouse: tryGreenhouse,
  lever: tryLever,
  ashby: tryAshby,
};

export type MigrationProbeAttempt = { ats: string; endpoint: string; matched: boolean };

export async function detectAtsMigration(
  companySlug: string,
  prevAts: AtsPlatform,
): Promise<{ match: MigrationMatch | null; attempts: MigrationProbeAttempt[] }> {
  const candidates = CANDIDATE_ATS.filter((ats) => ats !== prevAts);
  const attempts: MigrationProbeAttempt[] = [];

  for (const ats of candidates) {
    const endpoint = endpointForAts(companySlug, ats);
    try {
      const match = await PROBES[ats](companySlug);
      attempts.push({ ats, endpoint, matched: !!match });
      if (match) return { match, attempts };
    } catch {
      attempts.push({ ats, endpoint, matched: false });
    }
  }

  return { match: null, attempts };
}

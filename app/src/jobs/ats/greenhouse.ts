import type { RawJob } from "../index";
import { HttpError } from "../errors";

export async function fetchGreenhouseJobs(url: string): Promise<RawJob[]> {
  const result = await fetchGreenhouseJobsWithFallback(url);
  return result.jobs;
}

export async function fetchGreenhouseJobsWithFallback(url: string): Promise<{ jobs: RawJob[]; endpoint: string }> {
  let lastError: HttpError | null = null;

  for (const endpoint of greenhouseEndpointCandidates(url)) {
    const res = await fetch(endpoint, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) {
      lastError = new HttpError(res.status, `Greenhouse ${res.status}`);
      continue;
    }

    if (endpoint !== url) {
      console.log(`[sync:greenhouse] recovered endpoint ${url} -> ${endpoint}`);
    }

    const json = (await res.json()) as { jobs?: RawJob[] };
    return { jobs: json.jobs || [], endpoint };
  }

  throw lastError || new HttpError(404, "Greenhouse 404");
}

function greenhouseEndpointCandidates(url: string): string[] {
  const slug = extractBoardSlug(url);
  if (!slug) return [url];

  return unique([
    url,
    `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`,
    `https://job-boards.greenhouse.io/v1/boards/${slug}/jobs?content=true`,
    `https://job-boards.eu.greenhouse.io/v1/boards/${slug}/jobs?content=true`,
  ]);
}

function extractBoardSlug(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    const parts = url.pathname.split("/").filter(Boolean);
    const boardsIndex = parts.indexOf("boards");
    if (boardsIndex >= 0 && parts[boardsIndex + 1]) return parts[boardsIndex + 1];
    return parts[0] || null;
  } catch {
    return null;
  }
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

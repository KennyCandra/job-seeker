import type { AtsPlatform } from "../../shared/types";

export type ParsedAtsUrl = {
  ats: AtsPlatform;
  slug: string;
  endpoint: string;
  sourceUrl: string;
  jobId?: string;
};

export function parseAtsUrl(rawUrl: string): ParsedAtsUrl | null {
  const cleaned = cleanGoogleUrl(rawUrl);
  let url: URL;
  try {
    url = new URL(cleaned);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();
  const parts = url.pathname.split("/").filter(Boolean);

  if (isGreenhouseBoardHost(host)) {
    const slugIndex = parts[0] === "v1" && parts[1] === "boards" ? 2 : 0;
    const slug = parts[slugIndex];
    if (!slug) return null;
    const jobsIndex = parts.indexOf("jobs");
    const jobId = jobsIndex >= 0 ? parts[jobsIndex + 1] : undefined;
    return {
      ats: "greenhouse",
      slug: slug.toLowerCase(),
      endpoint: greenhouseEndpointFromHost(host, slug),
      sourceUrl: cleaned,
      jobId,
    };
  }

  if (host === "jobs.lever.co") {
    const slug = parts[0];
    if (!slug) return null;
    return {
      ats: "lever",
      slug: slug.toLowerCase(),
      endpoint: `https://api.lever.co/v0/postings/${slug}?mode=json`,
      sourceUrl: cleaned,
      jobId: parts[1],
    };
  }

  if (host === "jobs.ashbyhq.com") {
    const slug = parts[0];
    if (!slug) return null;
    return {
      ats: "ashby",
      slug: slug.toLowerCase(),
      endpoint: `https://api.ashbyhq.com/posting-api/job-board/${slug}?includeCompensation=true`,
      sourceUrl: cleaned,
      jobId: parts[1],
    };
  }

  return null;
}

function isGreenhouseBoardHost(host: string): boolean {
  return host === "boards.greenhouse.io"
    || host === "boards-api.greenhouse.io"
    || host.startsWith("job-boards.")
    || host.startsWith("boards-api.");
}

function greenhouseEndpointFromHost(host: string, slug: string): string {
  if (host.startsWith("job-boards.")) {
    return `https://${host}/v1/boards/${slug}/jobs?content=true`;
  }
  if (host.startsWith("boards-api.")) {
    return `https://${host}/v1/boards/${slug}/jobs?content=true`;
  }
  return `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`;
}

function cleanGoogleUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    if (url.hostname.includes("google.") && url.pathname === "/url") {
      return url.searchParams.get("q") || url.searchParams.get("url") || rawUrl;
    }
  } catch {}
  return rawUrl;
}
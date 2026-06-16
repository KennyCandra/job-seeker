import type { RawJob } from "../index";
import { HttpError } from "../errors";

export async function fetchAshbyJobs(url: string): Promise<RawJob[]> {
  const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new HttpError(res.status, `Ashby ${res.status}`);
  const json = (await res.json()) as { jobs?: RawJob[] };
  return json.jobs || [];
}

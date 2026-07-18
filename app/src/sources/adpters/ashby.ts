import { JobFetcher } from "./fetch-handler";

type RawJob = Record<string, unknown>;

export class AshbyFetcher extends JobFetcher {
  protected readonly potentialLinks = [
    "https://api.ashbyhq.com/posting-api/job-board/{slug}?includeCompensation=true",
  ];

  async fetch(companySlug: string): Promise<RawJob[]> {
    const url = this.potentialLinks[0].replace("{slug}", companySlug);
    const data = (await this.fetchJson(url, companySlug)) as { jobs?: RawJob[] };
    return data.jobs ?? [];
  }
}

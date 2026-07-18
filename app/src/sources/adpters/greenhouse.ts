import { JobFetcher } from "./fetch-handler";

type RawJob = Record<string, unknown>;

export class GreenHouseFetcher extends JobFetcher {
  protected readonly potentialLinks = [
    "https://boards-api.greenhouse.io/v1/boards/{slug}/jobs?content=true",
    "https://job-boards.greenhouse.io/v1/boards/{slug}/jobs?content=true",
    "https://job-boards.eu.greenhouse.io/v1/boards/{slug}/jobs?content=true",
  ];

  async fetch(companySlug: string): Promise<RawJob[]> {
    const url = this.potentialLinks[0].replace("{slug}", companySlug);
    const data = (await this.fetchJson(url, companySlug)) as { jobs?: RawJob[] };
    return data.jobs ?? [];
  }
}

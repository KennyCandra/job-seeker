import { JobFetcher } from "./fetch-handler";

type RawJob = Record<string, unknown>;

export class LeverFetcher extends JobFetcher {
  protected readonly potentialLinks = [
    "https://api.lever.co/v0/postings/{slug}?mode=json",
  ];

  async fetch(companySlug: string): Promise<RawJob[]> {
    const url = this.potentialLinks[0].replace("{slug}", companySlug);
    const data = (await this.fetchJson(url, companySlug)) as RawJob[];
    return Array.isArray(data) ? data : [];
  }
}

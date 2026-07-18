type RawJob = Record<string, unknown>;

export abstract class JobFetcher {
    protected abstract readonly potentialLinks: readonly string[];

    abstract fetch(companySlug: string): Promise<RawJob[]>;

    protected async fetchJson(url: string, companySlug: string): Promise<unknown> {
    const response = await fetch(url);

    if (!response.ok) {
      return this.retry(companySlug);
    }

    return response.json();
  }

  async retry(companySlug: string) {
    for (let i = 0; i < this.potentialLinks.length; i++) {
      const newUrl = this.potentialLinks[i].replace("{slug}", companySlug);
      const response = await fetch(newUrl);

      if (!response.ok) {
        console.log(newUrl , "not working")
        continue;
      }

      console.log(await response.json())
      return response.json();
    }

    
  }
}

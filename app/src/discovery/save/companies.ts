import { companies } from "../../db";
import type { DiscoveredCompany } from "../sources/playwright";

export type DiscoverySaveSummary = {
  found: number;
  added: number;
  updated: number;
  unchanged: number;
};

export async function saveNewDiscoveredCompanies(results: DiscoveredCompany[]): Promise<number> {
  return (await saveDiscoveredCompanies(results)).added;
}

export async function saveDiscoveredCompanies(results: DiscoveredCompany[]): Promise<DiscoverySaveSummary> {
  let added = 0;
  let updated = 0;
  let unchanged = 0;

  for (const r of results) {
    const existing = await companies.instance.getBySlug(r.slug);
    if (!existing) {
      await companies.instance.save({ slug: r.slug, name: r.name, ats: r.ats, endpoint: r.endpoint });
      added++;
      console.log(`[discovery] added company slug=${r.slug} ats=${r.ats} endpoint=${r.endpoint}`);
      continue;
    }

    if (existing.ats !== r.ats || existing.endpoint !== r.endpoint) {
      await companies.instance.updateAts(r.slug, r.ats, r.endpoint);
      updated++;
      console.log(`[discovery] updated company slug=${r.slug} ats=${r.ats} endpoint=${r.endpoint}`);
      continue;
    }

    unchanged++;
  }

  return { found: results.length, added, updated, unchanged };
}

import { companies } from "../../db";
import type { DiscoveredCompany } from "../sources/playwright";

export type DiscoverySaveSummary = {
  found: number;
  added: number;
  updated: number;
  unchanged: number;
};

export function saveNewDiscoveredCompanies(results: DiscoveredCompany[]): number {
  return saveDiscoveredCompanies(results).added;
}

export function saveDiscoveredCompanies(results: DiscoveredCompany[]): DiscoverySaveSummary {
  let added = 0;
  let updated = 0;
  let unchanged = 0;

  for (const r of results) {
    const existing = companies.instance.getBySlug(r.slug);
    if (!existing) {
      companies.instance.save({ slug: r.slug, name: r.name, ats: r.ats, endpoint: r.endpoint });
      added++;
      console.log(`[discovery] added company slug=${r.slug} ats=${r.ats} endpoint=${r.endpoint}`);
      continue;
    }

    if (existing.ats !== r.ats || existing.endpoint !== r.endpoint) {
      companies.instance.updateAts(r.slug, r.ats, r.endpoint);
      updated++;
      console.log(`[discovery] updated company slug=${r.slug} ats=${r.ats} endpoint=${r.endpoint}`);
      continue;
    }

    unchanged++;
  }

  return { found: results.length, added, updated, unchanged };
}

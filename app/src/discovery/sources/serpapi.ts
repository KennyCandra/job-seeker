import type { AtsPlatform } from "../../shared/types";
import { parseAtsUrl } from "../parse/atsUrl";
import type { DiscoveredCompany } from "./playwright";

type DorkQuery = {
  query: string;
  ats: AtsPlatform;
};

export async function discoverViaSerpApi(queries: DorkQuery[]): Promise<DiscoveredCompany[]> {
  const apiKey = process.env.SERPAPI_KEY || process.env.SERP_API_KEY;
  if (!apiKey) {
    console.warn("[discovery] SERPAPI_KEY/SERP_API_KEY not set, skipping SerpAPI discovery");
    return [];
  }

  const results: DiscoveredCompany[] = [];
  for (const [index, q] of queries.entries()) {
    try {
      console.log(`[discovery:serpapi] ${index + 1}/${queries.length} ats=${q.ats} query="${q.query}"`);
      const url = `https://serpapi.com/search?q=${encodeURIComponent(q.query)}&num=50&api_key=${apiKey}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
      const json = (await res.json()) as any;
      const links = (json.organic_results || []).map((r: any) => r.link).filter(Boolean);
      let parsedCount = 0;

      for (const link of links) {
        const parsed = parseAtsUrl(link);
        if (parsed && parsed.ats === q.ats) {
          parsedCount++;
          results.push({
            ats: parsed.ats,
            slug: parsed.slug,
            name: slugToName(parsed.slug),
            endpoint: parsed.endpoint,
            sourceUrl: parsed.sourceUrl,
          });
        }
      }
      console.log(`[discovery:serpapi] ${index + 1}/${queries.length} links=${links.length} parsed=${parsedCount} total=${results.length}`);
    } catch (err: any) {
      console.warn(`[discovery] SerpAPI query failed: ${err.message}`);
    }
  }

  console.log(`[discovery:serpapi] done rawResults=${results.length}`);
  return results;
}

function slugToName(slug: string): string {
  return slug
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

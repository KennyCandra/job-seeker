import type { AtsPlatform } from "../shared/types";
import type { SearchConfig } from "../shared/types";
import { companies } from "../db";
import { boardUrlForAts } from "../shared/index";

const GREENHOUSE_PATTERN = /greenhouse\.io\/([^\/\s?]+)/i;
const LEVER_PATTERN = /jobs\.lever\.co\/([^\/\s?]+)/i;
const ASHBY_PATTERN = /jobs\.ashbyhq\.com\/([^\/\s?]+)/i;

type DorkQuery = {
  query: string;
  ats: AtsPlatform;
};

export function buildDorkQueries(config: SearchConfig): DorkQuery[] {
  const queries: DorkQuery[] = [];
  const rolePart = config.roles.map((r) => `"${r}"`).join(" OR ");
  const locationPart = config.location.map((l) => `"${l}"`).join(" OR ");
  const excludePart = config.exclude.map((e) => `-"${e}"`).join(" ");

  if (config.ats.includes("greenhouse")) {
    queries.push({
      query: `site:greenhouse.io (${rolePart}) ${locationPart} ${excludePart}`,
      ats: "greenhouse",
    });
  }

  if (config.ats.includes("lever")) {
    queries.push({
      query: `site:lever.co (${rolePart}) ${locationPart} ${excludePart}`,
      ats: "lever",
    });
  }

  if (config.ats.includes("ashby")) {
    queries.push({
      query: `site:ashbyhq.com (${rolePart}) ${locationPart} ${excludePart}`,
      ats: "ashby",
    });
  }

  return queries;
}

export function discoverViaPlaywright(queries: DorkQuery[]): Promise<Array<{ ats: AtsPlatform; slug: string; name: string }>> {
  return (async () => {
    const results: Array<{ ats: AtsPlatform; slug: string; name: string }> = [];
    console.log(`[discovery] Running ${queries.length} dork queries via Playwright...`);

    const { chromium } = await import("playwright");
    const browser = await chromium.launch({ headless: true });

    try {
      for (const q of queries) {
        console.log(`[discovery] Query: ${q.query}`);
        const context = await browser.newContext({
          userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        });
        const page = await context.newPage();

        try {
          await page.goto(`https://www.google.com/search?q=${encodeURIComponent(q.query)}&num=50`, {
            waitUntil: "domcontentloaded",
            timeout: 30000,
          });
          await page.waitForTimeout(2000);

          const links = await page.evaluate(() => {
            const anchors = document.querySelectorAll("a[href]");
            return Array.from(anchors).map((a) => (a as HTMLAnchorElement).href);
          });

          for (const link of links) {
            const slug = extractSlug(link, q.ats);
            if (slug) {
              const name = slugToName(slug);
              results.push({ ats: q.ats, slug, name });
            }
          }
        } catch (err: any) {
          console.warn(`[discovery] Query failed: ${err.message}`);
        }

        await context.close();
        await delay(5000 + Math.random() * 3000);
      }
    } finally {
      await browser.close();
    }

    console.log(`[discovery] Found ${results.length} company references`);
    const unique = deduplicateResults(results);
    console.log(`[discovery] ${unique.length} unique companies`);
    return unique;
  })();
}

function extractSlug(url: string, ats: AtsPlatform): string | null {
  switch (ats) {
    case "greenhouse": {
      const m = url.match(GREENHOUSE_PATTERN);
      if (m) return m[1].toLowerCase();
      return null;
    }
    case "lever": {
      const m = url.match(LEVER_PATTERN);
      if (m) return m[1].toLowerCase();
      return null;
    }
    case "ashby": {
      const m = url.match(ASHBY_PATTERN);
      if (m) return m[1].toLowerCase();
      return null;
    }
  }
}

function slugToName(slug: string): string {
  return slug
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function deduplicateResults(results: Array<{ ats: AtsPlatform; slug: string; name: string }>): Array<{ ats: AtsPlatform; slug: string; name: string }> {
  const seen = new Set<string>();
  return results.filter((r) => {
    const key = `${r.ats}:${r.slug}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function saveNewDiscoveredCompanies(
  results: Array<{ ats: AtsPlatform; slug: string; name: string }>,
): number {
  let added = 0;
  for (const r of results) {
    const existing = companies.instance.getBySlug(r.slug);
    if (!existing) {
      const boardUrl = boardUrlForAts(r.slug, r.ats);
      companies.instance.save({ slug: r.slug, name: r.name, ats: r.ats, boardUrl });
      added++;
    }
  }
  return added;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

import type { AtsPlatform } from "../../shared/types";
import { parseAtsUrl } from "../parse/atsUrl";

type DorkQuery = {
  query: string;
  ats: AtsPlatform;
};

export type DiscoveredCompany = {
  ats: AtsPlatform;
  slug: string;
  name: string;
  endpoint: string;
  sourceUrl: string;
};

export async function discoverViaPlaywright(queries: DorkQuery[]): Promise<DiscoveredCompany[]> {
  const results: DiscoveredCompany[] = [];
  console.log(`[discovery] Running ${queries.length} dork queries via Playwright...`);

  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });

  try {
    for (const [index, q] of queries.entries()) {
      console.log(`[discovery:playwright] ${index + 1}/${queries.length} ats=${q.ats} query="${q.query}"`);
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

        const bodyText = await page.locator("body").innerText({ timeout: 2000 }).catch(() => "");
        if (/unusual traffic|detected unusual traffic|sorry\/index|not a robot|verify you are human/i.test(bodyText)) {
          console.warn(`[discovery:playwright] ${index + 1}/${queries.length} google blocked query`);
          await context.close();
          await delay(5000 + Math.random() * 3000);
          continue;
        }

        const links = await page.evaluate(() => {
          const anchors = document.querySelectorAll("a[href]");
          return Array.from(anchors).map((a) => (a as HTMLAnchorElement).href);
        });
        let parsedCount = 0;

        for (const link of links) {
          const parsed = parseAtsUrl(link);
          if (parsed && parsed.ats === q.ats) {
            parsedCount++;
            const name = slugToName(parsed.slug);
            results.push({
              ats: parsed.ats,
              slug: parsed.slug,
              name,
              endpoint: parsed.endpoint,
              sourceUrl: parsed.sourceUrl,
            });
          }
        }
        console.log(`[discovery:playwright] ${index + 1}/${queries.length} links=${links.length} parsed=${parsedCount} total=${results.length}`);
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
}

export function deduplicateResults(results: DiscoveredCompany[]): DiscoveredCompany[] {
  const seen = new Set<string>();
  return results.filter((r) => {
    const key = `${r.ats}:${r.slug}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function slugToName(slug: string): string {
  return slug
    .split(/[-_]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

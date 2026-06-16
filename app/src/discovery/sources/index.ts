import type { AtsPlatform, SearchConfig } from "../../shared/types";

type DorkQuery = {
  query: string;
  ats: AtsPlatform;
};

export function buildDorkQueries(config: SearchConfig): DorkQuery[] {
  const queries: DorkQuery[] = [];
  const roles = unique([
    ...config.roles,
    "backend engineer",
    "frontend engineer",
    "full stack engineer",
    "fullstack engineer",
    "software engineer",
    "platform engineer",
    "infrastructure engineer",
    "site reliability engineer",
    "devops engineer",
    "cloud engineer",
    "data engineer",
    "machine learning engineer",
    "AI engineer",
    "security engineer",
    "mobile engineer",
    "product engineer",
    "typescript engineer",
    "react engineer",
    "node engineer",
    "python engineer",
    "golang engineer",
  ]);
  const locations = unique([
    ...config.location,
    "EMEA",
    "Europe",
    "European Union",
    "remote Europe",
    "remote EMEA",
    "UK",
    "Germany",
    "Netherlands",
    "France",
    "Spain",
    "Portugal",
    "Berlin",
    "Amsterdam",
    "London",
    "Lisbon",
    "Madrid",
  ]);
  const rolePart = roles.map((r) => `"${r}"`).join(" OR ");
  const locationPart = locations.slice(0, 8).map((l) => `"${l}"`).join(" OR ");
  const excludePart = config.exclude.map((e) => `-"${e}"`).join(" ");
  const focusedRoles = roles.slice(0, 18);
  const focusedLocations = locations.slice(0, 14);

  if (config.ats.includes("greenhouse")) {
    for (const site of [
      "boards.greenhouse.io",
      "job-boards.greenhouse.io",
      "job-boards.eu.greenhouse.io",
    ]) {
      queries.push({ query: `site:${site} (${rolePart}) ${locationPart} ${excludePart}`, ats: "greenhouse" });
    }
  }

  if (config.ats.includes("lever")) {
    queries.push({
      query: `site:jobs.lever.co (${rolePart}) ${locationPart} ${excludePart}`,
      ats: "lever",
    });
  }

  if (config.ats.includes("ashby")) {
    queries.push({
      query: `site:jobs.ashbyhq.com (${rolePart}) ${locationPart} ${excludePart}`,
      ats: "ashby",
    });
  }

  for (const role of focusedRoles) {
    const roleLocationPart = focusedLocations.slice(0, 8).map((l) => `"${l}"`).join(" OR ");
    if (config.ats.includes("greenhouse")) {
      queries.push({ query: `site:job-boards.greenhouse.io "${role}" (${roleLocationPart}) ${excludePart}`, ats: "greenhouse" });
      queries.push({ query: `site:job-boards.eu.greenhouse.io "${role}" (${roleLocationPart}) ${excludePart}`, ats: "greenhouse" });
    }
    if (config.ats.includes("lever")) {
      queries.push({ query: `site:jobs.lever.co "${role}" (${roleLocationPart}) ${excludePart}`, ats: "lever" });
    }
    if (config.ats.includes("ashby")) {
      queries.push({ query: `site:jobs.ashbyhq.com "${role}" (${roleLocationPart}) ${excludePart}`, ats: "ashby" });
    }
  }

  for (const location of focusedLocations) {
    const locationRolePart = focusedRoles.slice(0, 8).map((r) => `"${r}"`).join(" OR ");
    if (config.ats.includes("greenhouse")) {
      queries.push({ query: `site:job-boards.eu.greenhouse.io (${locationRolePart}) "${location}" ${excludePart}`, ats: "greenhouse" });
      queries.push({ query: `site:job-boards.greenhouse.io (${locationRolePart}) "${location}" ${excludePart}`, ats: "greenhouse" });
    }
    if (config.ats.includes("lever")) {
      queries.push({ query: `site:jobs.lever.co (${locationRolePart}) "${location}" ${excludePart}`, ats: "lever" });
    }
    if (config.ats.includes("ashby")) {
      queries.push({ query: `site:jobs.ashbyhq.com (${locationRolePart}) "${location}" ${excludePart}`, ats: "ashby" });
    }
  }

  const maxQueries = Math.max(1, Number(process.env.DISCOVERY_MAX_DORK_QUERIES || 60));
  return deduplicateQueries(queries).slice(0, maxQueries);
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function deduplicateQueries(queries: DorkQuery[]): DorkQuery[] {
  const seen = new Set<string>();
  return queries.filter((query) => {
    const key = `${query.ats}:${query.query}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export { discoverViaPlaywright, deduplicateResults } from "./playwright";
export type { DiscoveredCompany } from "./playwright";
export { discoverViaSerpApi } from "./serpapi";

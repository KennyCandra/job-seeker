import { buildDorkQueries, discoverViaPlaywright, saveNewDiscoveredCompanies } from "../discovery/index";
import { loadSearchConfig } from "../shared/config";

export async function runDiscoveryPoller() {
  try {
    const config = loadSearchConfig();
    const queries = buildDorkQueries(config);
    const discovered = await discoverViaPlaywright(queries);
    const count = saveNewDiscoveredCompanies(discovered);
    console.log(`[discovery-poller] ${count} new companies added`);
  } catch (err) {
    console.error("[discovery-poller] Error:", err);
  }
}

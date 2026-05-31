import { start } from "./server/index";
import { startBot } from "./telegram/index";
import { runSeedIfEmpty, runDiscovery, createClient } from "./pipeline";
import { fetchAllJobs } from "./jobs/index";
import { filterJobs, saveFilterResults } from "./filter/index";
import { loadSearchConfig } from "./shared/config";

start();
startBot();

async function poll() {
  try {
    const config = loadSearchConfig();

    console.log("[poller] Fetching jobs...");
    const newJobs = await fetchAllJobs();
    if (newJobs.length === 0) return;

    const client = createClient();
    const results = await filterJobs(client, newJobs, config);
    saveFilterResults(results);
    const accepted = results.filter((r) => r.filter.verdict === "accept" && r.filter.score >= config.min_score);
    if (accepted.length > 0) {
      console.log(`[poller] ${accepted.length} matching jobs found — run /run in Telegram`);
    }
  } catch (err) {
    console.error("[poller] Error:", err);
  }
}

const pollIntervalHours = Number(process.env.POLL_INTERVAL_HOURS) || 0;
if (pollIntervalHours > 0) {
  const ms = pollIntervalHours * 60 * 60 * 1000;
  console.log(`[poller] Enabled: every ${pollIntervalHours}h`);
  setInterval(poll, ms);
  poll();
}

const discoveryIntervalHours = loadSearchConfig().discovery_interval_hours || 48;
const discoveryMs = discoveryIntervalHours * 60 * 60 * 1000;
console.log(`[discovery-poller] Enabled: every ${discoveryIntervalHours}h`);
setInterval(runDiscoveryPoller, discoveryMs);
runDiscoveryPoller();

async function runDiscoveryPoller() {
  try {
    await runSeedIfEmpty();
    const count = await runDiscovery();
    console.log(`[discovery-poller] ${count} new companies added`);
  } catch (err) {
    console.error("[discovery-poller] Error:", err);
  }
}

process.on("SIGINT", () => {
  console.log("\nShutting down...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\nShutting down...");
  process.exit(0);
});

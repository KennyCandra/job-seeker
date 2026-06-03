import { fetchAllJobs } from "../jobs/index";
import { filterJobs, saveFilterResults } from "../filter/index";
import { createClient } from "../shared/client";
import { loadSearchConfig } from "../shared/config";

export async function poll() {
  try {
    const config = loadSearchConfig();
    console.log("[poller] Fetching jobs...");
    const newJobs = await fetchAllJobs();
    if (newJobs.length === 0) return;

    const client = createClient();
    const results = await filterJobs(client, newJobs, config);
    saveFilterResults(results);
    const accepted = results.filter(
      (r) => r.filter.verdict === "accept" && r.filter.score >= config.min_score,
    );
    if (accepted.length > 0) {
      console.log(`[poller] ${accepted.length} matching jobs found — run /run in Telegram`);
    }
  } catch (err) {
    console.error("[poller] Error:", err);
  }
}

import { start } from "./server.ts";
import { startBot } from "./telegram.ts";
import { fetchJobs, filterJobs, createClient } from "./pipeline.ts";

start();
startBot();

const pollIntervalHours = Number(process.env.POLL_INTERVAL_HOURS) || 0;
if (pollIntervalHours > 0) {
  const ms = pollIntervalHours * 60 * 60 * 1000;
  console.log(`Poller enabled: every ${pollIntervalHours}h`);

  async function poll() {
    try {
      const client = createClient();
      const newJobs = await fetchJobs({});
      if (newJobs.length === 0) return;

      const results = await filterJobs(client, newJobs);
      const accepted = results.filter((r) => r.filter.verdict === "accept");
      if (accepted.length > 0) {
        console.log(`[poller] ${accepted.length} matching jobs found — run /run in Telegram`);
      }
    } catch (err) {
      console.error("[poller] Error:", err);
    }
  }

  setInterval(poll, ms);
  poll();
}

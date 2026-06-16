import { runFetchAndFilter } from "../pipeline";

export async function poll() {
  try {
    const result = await runFetchAndFilter();
    const { accepted, sync } = result;
    if (accepted.length > 0) {
      console.log(`[poller] ${accepted.length} matching jobs found — run /run in Telegram`);
    } else {
      const totalCandidates = sync.newJobs.length + sync.changedJobs.length;
      if (totalCandidates > 0) {
        console.log(`[poller] ${totalCandidates} jobs checked, none matched criteria`);
      }
    }
  } catch (err) {
    console.error("[poller] Error:", err);
  }
}
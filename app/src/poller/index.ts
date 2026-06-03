import { poll } from "./jobs";
import { runDiscoveryPoller } from "./discovery";

export function startPollers() {
  const pollIntervalHours = Number(process.env.POLL_INTERVAL_HOURS) || 0;
  if (pollIntervalHours > 0) {
    const ms = pollIntervalHours * 60 * 60 * 1000;
    console.log(`[poller] Enabled: every ${pollIntervalHours}h`);
    setInterval(poll, ms);
    poll();
  }

  const discoveryIntervalHours = Number(process.env.DISCOVERY_INTERVAL_HOURS) || 0;
  if (discoveryIntervalHours > 0) {
    const discoveryMs = discoveryIntervalHours * 60 * 60 * 1000;
    console.log(`[discovery-poller] Enabled: every ${discoveryIntervalHours}h`);
    setInterval(runDiscoveryPoller, discoveryMs);
    runDiscoveryPoller();
  }
}

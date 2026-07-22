export type CatchUpAction = "full" | "smart-only" | "none";

type CompletedRunLike = { completedAt: string | null; resultJson: string | null };

/**
 * Decides what the hourly catch-up tick should enqueue, from recent COMPLETED
 * daily-pipeline runs:
 *  - no run with syncRan=true within catchupHours   -> "full"
 *  - sync fresh, but no run with smartFilterRan=true within the window
 *    (OpenCode was offline)                          -> "smart-only"
 *  - both fresh                                      -> "none"
 * Malformed/missing resultJson rows are ignored (treated as absent).
 */
export function decideCatchUp(runs: CompletedRunLike[], now: Date, catchupHours: number): CatchUpAction {
  const threshold = now.getTime() - catchupHours * 3600_000;
  let syncFresh = false;
  let smartFresh = false;
  for (const run of runs) {
    if (!run.completedAt) continue;
    const t = Date.parse(run.completedAt);
    if (Number.isNaN(t) || t < threshold) continue;
    let parsed: { syncRan?: unknown; smartFilterRan?: unknown } | null = null;
    try {
      parsed = run.resultJson ? JSON.parse(run.resultJson) : null;
    } catch {
      continue;
    }
    if (parsed?.syncRan === true) syncFresh = true;
    if (parsed?.smartFilterRan === true) smartFresh = true;
  }
  if (!syncFresh) return "full";
  if (!smartFresh) return "smart-only";
  return "none";
}

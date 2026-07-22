"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.decideCatchUp = decideCatchUp;
function decideCatchUp(runs, now, catchupHours) {
    const threshold = now.getTime() - catchupHours * 3600_000;
    let syncFresh = false;
    let smartFresh = false;
    for (const run of runs) {
        if (!run.completedAt)
            continue;
        const t = Date.parse(run.completedAt);
        if (Number.isNaN(t) || t < threshold)
            continue;
        let parsed = null;
        try {
            parsed = run.resultJson ? JSON.parse(run.resultJson) : null;
        }
        catch {
            continue;
        }
        if (parsed?.syncRan === true)
            syncFresh = true;
        if (parsed?.smartFilterRan === true)
            smartFresh = true;
    }
    if (!syncFresh)
        return "full";
    if (!smartFresh)
        return "smart-only";
    return "none";
}
//# sourceMappingURL=catch-up.js.map
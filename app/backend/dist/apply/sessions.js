"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPausedApplySession = registerPausedApplySession;
exports.getPausedApplySession = getPausedApplySession;
exports.clearPausedApplySession = clearPausedApplySession;
exports.resumePausedApplySession = resumePausedApplySession;
exports.cancelPausedApplySession = cancelPausedApplySession;
const sessions = new Map();
function registerPausedApplySession(session) {
    sessions.set(session.runId, session);
}
function getPausedApplySession(runId) {
    return sessions.get(runId);
}
function clearPausedApplySession(runId) {
    sessions.delete(runId);
}
async function resumePausedApplySession(runId) {
    const session = sessions.get(runId);
    if (!session) {
        throw new Error("No live paused browser session for this run");
    }
    return session.resume();
}
async function cancelPausedApplySession(runId) {
    const session = sessions.get(runId);
    if (!session) {
        throw new Error("No live paused browser session for this run");
    }
    await session.cancel();
}
//# sourceMappingURL=sessions.js.map
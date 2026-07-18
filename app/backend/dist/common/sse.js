"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSse = setupSse;
function setupSse(res) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    return (event, data) => {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };
}
//# sourceMappingURL=sse.js.map
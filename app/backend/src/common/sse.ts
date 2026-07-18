import type { Response } from "express";

export type SseSender = (event: string, data: unknown) => void;

/** Set up an SSE response and return a typed event sender. */
export function setupSse(res: Response): SseSender {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();
  return (event: string, data: unknown) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };
}

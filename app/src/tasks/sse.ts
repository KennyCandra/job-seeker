import type { Response } from "express";
import { taskRuns, taskRunLogs } from "../db";

export async function sseTaskEvents(res: Response, runId: string): Promise<void> {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const run = await taskRuns.instance.getById(runId);
  if (!run) {
    send("error", { message: "Task run not found" });
    res.end();
    return;
  }

  send("status", { status: run.status });

  const logs = await taskRunLogs.instance.getByRunId(runId);
  for (const log of logs) {
    send("log", { id: log.id, level: log.level, message: log.message, createdAt: log.createdAt });
  }
  let lastLogCursor = logs.length > 0
    ? { createdAt: logs[logs.length - 1].createdAt, id: logs[logs.length - 1].id }
    : null;

  if (run.resultJson) send("result", JSON.parse(run.resultJson));
  if (run.error) send("error", { error: run.error });

  if (["completed", "failed", "cancelled"].includes(run.status)) {
    send("done", { status: run.status });
    res.end();
    return;
  }

  const interval = setInterval(() => {
    void (async () => {
      const updatedRun = await taskRuns.instance.getById(runId);
      if (!updatedRun) {
        clearInterval(interval);
        send("error", { message: "Task run deleted" });
        send("done", { status: "failed" });
        res.end();
        return;
      }

      send("status", { status: updatedRun.status });

      const newLogs = await taskRunLogs.instance.getAfter(runId, lastLogCursor);
      for (const log of newLogs) {
        send("log", { id: log.id, level: log.level, message: log.message, createdAt: log.createdAt });
        lastLogCursor = { createdAt: log.createdAt, id: log.id };
      }

      if (updatedRun.progressJson) {
        try { send("progress", JSON.parse(updatedRun.progressJson)); } catch {}
      }

      if (updatedRun.resultJson) {
        try { send("result", JSON.parse(updatedRun.resultJson)); } catch {}
      }

      if (["completed", "failed", "cancelled"].includes(updatedRun.status)) {
        clearInterval(interval);
        send("done", { status: updatedRun.status });
        res.end();
      }
    })();
  }, 1000);

  res.on("close", () => {
    clearInterval(interval);
  });
}

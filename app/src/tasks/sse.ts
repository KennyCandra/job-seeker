import type { Response } from "express";
import { taskRuns, taskRunLogs } from "../db";
import type { TaskRunLogRecord } from "../queue/types";

export function sseTaskEvents(res: Response, runId: string): void {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const send = (event: string, data: unknown) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const run = taskRuns.instance.getById(runId);
  if (!run) {
    send("error", { message: "Task run not found" });
    res.end();
    return;
  }

  send("status", { status: run.status });

  const logs = taskRunLogs.instance.getByRunId(runId);
  for (const log of logs) {
    send("log", { id: log.id, level: log.level, message: log.message, createdAt: log.createdAt });
  }

  if (run.resultJson) send("result", JSON.parse(run.resultJson));
  if (run.error) send("error", { error: run.error });

  if (["completed", "failed", "cancelled"].includes(run.status)) {
    send("done", { status: run.status });
    res.end();
    return;
  }

  const sentLogIds = new Set(logs.map((log) => log.id));
  const interval = setInterval(() => {
    const updatedRun = taskRuns.instance.getById(runId);
    if (!updatedRun) {
      clearInterval(interval);
      send("error", { message: "Task run deleted" });
      send("done", { status: "failed" });
      res.end();
      return;
    }

    send("status", { status: updatedRun.status });

    const newLogs = taskRunLogs.instance.getByRunId(runId).filter((log) => !sentLogIds.has(log.id));
    for (const log of newLogs) {
      sentLogIds.add(log.id);
      send("log", { id: log.id, level: log.level, message: log.message, createdAt: log.createdAt });
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
  }, 1000);

  res.on("close", () => {
    clearInterval(interval);
  });
}

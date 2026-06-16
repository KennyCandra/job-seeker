import { Router, type Request, type Response } from "express";
import { taskRuns, taskRunLogs } from "../../db";
import { enqueueTask, cancelTask } from "../../queue/enqueue";
import { sseTaskEvents } from "../../tasks/sse";
import type { TaskType } from "../../queue/types";

const router = Router();

router.get("/api/tasks", async (_req: Request, res: Response) => {
  try {
    const all = await taskRuns.instance.getAll(100);
    res.json({ ok: true, tasks: all });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/tasks", async (req: Request, res: Response) => {
  try {
    const { type, payload, force } = req.body as {
      type: TaskType;
      payload: Record<string, unknown>;
      force?: boolean;
    };

    if (!type) {
      res.status(400).json({ error: "type is required" });
      return;
    }

    const result = await enqueueTask(type, payload || {}, { force: !!force });
    res.json({ ok: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/api/tasks/:runId", async (req: Request, res: Response) => {
  try {
    const runId = String(req.params.runId);
    const run = await taskRuns.instance.getById(runId);
    if (!run) {
      res.status(404).json({ error: "Task run not found" });
      return;
    }
    res.json({ ok: true, run });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/api/tasks/:runId/events", async (req: Request, res: Response) => {
  const runId = String(req.params.runId);
  await sseTaskEvents(res, runId);
});

router.post("/api/tasks/:runId/cancel", async (req: Request, res: Response) => {
  try {
    const runId = String(req.params.runId);
    const ok = await cancelTask(runId);
    res.json({ ok });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

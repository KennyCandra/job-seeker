import { Router, type Request, type Response } from "express";
import { taskRuns, taskRunLogs } from "../../db";
import { enqueueTask, cancelTask } from "../../queue/enqueue";
import { sseTaskEvents } from "../../tasks/sse";
import type { TaskType } from "../../queue/types";
import { requireLocalOrAdmin } from "../middleware/adminGuard";

const router = Router();
const taskTypes = new Set<TaskType>([
  "discover-companies",
  "discover-fetch-filter",
  "sync-all-jobs",
  "sync-company",
  "normal-filter-batch",
  "normal-filter-job",
  "smart-filter-accepted",
  "smart-filter-job",
  "refetch-job",
  "create-application",
  "run-apply",
]);

router.use("/tasks", requireLocalOrAdmin);

router.get("/tasks", async (_req: Request, res: Response) => {
  try {
    const all = await taskRuns.instance.getAll(100);
    res.json({ ok: true, tasks: all });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/tasks", async (req: Request, res: Response) => {
  try {
    const { type, payload, force } = req.body as {
      type: TaskType;
      payload: Record<string, unknown>;
      force?: boolean;
    };

    if (!taskTypes.has(type)) {
      res.status(400).json({ error: "Invalid task type" });
      return;
    }

    const validationError = validateTaskPayload(type, payload || {});
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const result = await enqueueTask(type, payload || {}, { force: !!force });
    res.json({ ok: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/tasks/:runId", async (req: Request, res: Response) => {
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

router.get("/tasks/:runId/events", async (req: Request, res: Response) => {
  const runId = String(req.params.runId);
  await sseTaskEvents(res, runId);
});

router.post("/tasks/:runId/cancel", async (req: Request, res: Response) => {
  try {
    const runId = String(req.params.runId);
    const ok = await cancelTask(runId);
    res.json({ ok });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

function validateTaskPayload(type: TaskType, payload: Record<string, unknown>): string | null {
  const stringField = (key: string) => typeof payload[key] === "string" && String(payload[key]).trim().length > 0;

  switch (type) {
    case "sync-company":
      return stringField("companySlug") ? null : "payload.companySlug is required";
    case "normal-filter-job":
    case "smart-filter-job":
    case "refetch-job":
    case "create-application":
      return stringField("jobId") ? null : "payload.jobId is required";
    case "run-apply":
      if (!stringField("applyRunId")) return "payload.applyRunId is required";
      if (!stringField("jobId")) return "payload.jobId is required";
      if (!stringField("url")) return "payload.url is required";
      return null;
    default:
      return null;
  }
}

import { Router, type Request, type Response } from "express";
import { join, resolve } from "path";
import { existsSync } from "fs";
import { jobs, applicationRuns, applicationRunSteps } from "../../db";
import { resolveProfilePath } from "../../apply/profile";
import { cancelPausedApplySession, resumePausedApplySession } from "../../apply/sessions";
import { sendError } from "../middleware/response";
import { enqueueTask } from "../../queue/enqueue";
import { resolveContainedPath } from "../security/paths";

const router = Router();

router.post("/jobs/:jobId/apply/run", async (req: Request, res: Response) => {
  try {
    const jobId = String(req.params.jobId);
    const job = await jobs.instance.getById(jobId);
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    if (!job.url) {
      res.status(400).json({ error: "Job has no URL to apply at" });
      return;
    }

    const runId = `apply-${jobId}-${Date.now()}`;
    const profilePath = resolveProfilePath(req.body?.profilePath);

    await applicationRuns.instance.create({
      id: runId,
      jobId,
      profilePath,
      outputDir: "",
      currentUrl: job.url,
    });

    await applicationRunSteps.instance.create({
      id: `step-${runId}-init`,
      runId,
      type: "info",
      label: "run-started",
      detail: `Starting apply run for ${job.title} at ${job.companyName}`,
    });

    const task = await enqueueTask("run-apply", {
      applyRunId: runId,
      jobId,
      url: job.url,
      profilePath,
    }, {
      dedupeKey: `run-apply:${runId}`,
      jobId: `run-apply:${runId}`,
    });

    res.json({ ok: true, runId, taskRunId: task.runId, message: "Apply run queued" });
  } catch (err: any) {
    sendError(res, err.message);
  }
});

router.get("/jobs/:jobId/apply/latest", async (req: Request, res: Response) => {
  try {
    const jobId = String(req.params.jobId);
    const run = await applicationRuns.instance.getLatestByJobId(jobId);

    if (!run) {
      res.json({ run: null, steps: [] });
      return;
    }

    const steps = await applicationRunSteps.instance.getByRunId(run.id);
    res.json({ run, steps });
  } catch (err: any) {
    sendError(res, err.message);
  }
});

router.get("/apply/runs/:runId", async (req: Request, res: Response) => {
  try {
    const runId = String(req.params.runId);
    const run = await applicationRuns.instance.getById(runId);

    if (!run) {
      res.status(404).json({ error: "Run not found" });
      return;
    }

    const steps = await applicationRunSteps.instance.getByRunId(runId);
    res.json({ run, steps });
  } catch (err: any) {
    sendError(res, err.message);
  }
});

router.post("/apply/runs/:runId/resume", async (req: Request, res: Response) => {
  try {
    const runId = String(req.params.runId);
    const result = await resumePausedApplySession(runId);
    res.json({ ok: true, result });
  } catch (err: any) {
    sendError(res, err.message);
  }
});

router.post("/apply/runs/:runId/cancel", async (req: Request, res: Response) => {
  try {
    const runId = String(req.params.runId);
    await cancelPausedApplySession(runId);
    res.json({ ok: true });
  } catch (err: any) {
    sendError(res, err.message);
  }
});

router.get("/apply/runs/:runId/screenshots/:file", async (req: Request, res: Response) => {
  try {
    const runId = String(req.params.runId);
    const fileName = String(req.params.file);
    const run = await applicationRuns.instance.getById(runId);

    if (!run) {
      res.status(404).json({ error: "Run not found" });
      return;
    }

    if (!run.outputDir) {
      res.status(404).json({ error: "No output directory for this run" });
      return;
    }

    const outputDir = resolve(run.outputDir);
    const filePath = resolveContainedPath(outputDir, join(outputDir, fileName));
    if (!filePath) {
      res.status(403).json({ error: "Invalid path" });
      return;
    }

    if (!existsSync(filePath)) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const ext = fileName.toLowerCase().split(".").pop();
    const contentType = ext === "png" ? "image/png" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "application/octet-stream";

    res.setHeader("Content-Type", contentType);
    res.sendFile(filePath);
  } catch (err: any) {
    sendError(res, err.message);
  }
});

export default router;

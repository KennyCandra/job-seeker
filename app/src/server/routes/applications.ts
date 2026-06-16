import { Router, type Request, type Response } from "express";
import { join } from "path";
import { existsSync, readFileSync, readdirSync } from "fs";
import { applications, savedJobs } from "../../db";
import { JOBS_DIR, SKILLS_DIR, slug, createClient } from "../../shared/index";
import { loadSearchConfig } from "../../shared/config";
import { readText } from "../../shared/utils";
import { filterJob } from "../../filter/index";
import { makeCvForJob } from "../../generator/index";
import type { AppStatus, JobRecord } from "../../shared/types";
import { sseSetup, sseSend } from "../middleware/sse";

const router = Router();

router.get("/api/applications", async (_req: Request, res: Response) => {
  try {
    const all = await applications.instance.getAll();
    res.json(all);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/api/applications/:jobId/status", async (req: Request, res: Response) => {
  try {
    const jobId = String(req.params.jobId);
    const { status } = req.body as { status: AppStatus };
    const valid: AppStatus[] = [
      "approved", "ready", "applied", "interviewing",
      "offer", "rejected", "ghosted", "withdrawn",
    ];
    if (!valid.includes(status)) {
      res.status(400).json({ error: `Invalid status: ${status}` });
      return;
    }
    await applications.instance.updateStatus(jobId, status);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/api/applications/:jobId", async (req: Request, res: Response) => {
  try {
    await applications.instance.delete(String(req.params.jobId));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/api/applications/:jobId/pdf", async (req: Request, res: Response) => {
  try {
    const appRow = await applications.instance.getByJobId(String(req.params.jobId));
    if (!appRow) { res.status(404).json({ error: "Application not found" }); return; }

    const companySlug = slug(appRow.company);
    const dataDir = join(JOBS_DIR, companySlug);
    if (!existsSync(dataDir)) { res.status(404).json({ error: "No files found" }); return; }

    const files = readdirSync(dataDir).filter((f) => f.endsWith(".pdf"));
    if (files.length === 0) { res.status(404).json({ error: "No PDF found" }); return; }

    const pdfPath = join(dataDir, files[0]);
    const pdfData = readFileSync(pdfPath);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${files[0]}"`);
    res.send(pdfData);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ── Generate CV from Application (SSE) ──

router.post("/api/applications/:jobId/generate", (req: Request, res: Response) => {
  sseSetup(res);

  (async () => {
    try {
      const jobId = String(req.params.jobId);
      const force = req.query.force === "true";
      const appRow = await applications.instance.getByJobId(jobId);
      if (!appRow) {
        sseSend(res, "log", { type: "error", message: "Application not found" });
        sseSend(res, "done", { error: "Application not found" });
        res.end();
        return;
      }

      const companySlug = slug(appRow.company);
      const saved = await savedJobs.instance.get(companySlug, jobId);

      const existingPdf = (() => {
        try {
          const dir = join(JOBS_DIR, companySlug);
          const files = readdirSync(dir).filter((f) => f.endsWith(".pdf"));
          return files.length > 0 ? join(dir, files[0]) : null;
        } catch {
          return null;
        }
      })();

      if (existingPdf && !force) {
        sseSend(res, "exists", {
          pdfPath: `/api/applications/${jobId}/pdf`,
          message: "CV already exists",
        });
        sseSend(res, "done", { exists: true, pdfPath: `/api/applications/${jobId}/pdf` });
        res.end();
        return;
      }

      const job: JobRecord = {
        id: jobId, site: appRow.site, title: appRow.title,
        company: appRow.company, location: appRow.location,
        url: appRow.url, description: saved?.description || "",
      };

      sseSend(res, "log", { type: "info", message: `Generating CV for ${job.company} — ${job.title}...` });

      const client = createClient();
      await makeCvForJob(job, appRow.score, client);

      const pdfFiles = (() => {
        try {
          const dir = join(JOBS_DIR, companySlug);
          return readdirSync(dir).filter((f) => f.endsWith(".pdf"));
        } catch { return []; }
      })();

      sseSend(res, "log", { type: "done", message: "CV generated successfully" });
      sseSend(res, "done", {
        pdfPath: pdfFiles.length > 0 ? `/api/applications/${jobId}/pdf` : null,
        company: job.company,
      });
    } catch (err: any) {
      sseSend(res, "log", { type: "error", message: err.message });
      sseSend(res, "done", { error: err.message });
    }
    res.end();
  })();
});

export default router;

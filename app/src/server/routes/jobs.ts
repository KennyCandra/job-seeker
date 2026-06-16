import { Router, type Request, type Response } from "express";
import { basename } from "path";
import { existsSync, readFileSync } from "fs";
import { jobs, applications, jobFilters, jobDocuments } from "../../db";
import { sendError } from "../middleware/response";
import { enqueueTask } from "../../queue/enqueue";

const router = Router();

router.get("/api/jobs", async (req: Request, res: Response) => {
  try {
    const result = await jobs.instance.search({
      page: Number(req.query.page) || 1,
      pageSize: Number(req.query.pageSize) || 50,
      search: String(req.query.search || ""),
      companyName: String(req.query.company || ""),
      status: String(req.query.status || ""),
      verdict: String(req.query.verdict || ""),
      minScore: Number(req.query.minScore) || 0,
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/jobs/filter-candidates", async (req: Request, res: Response) => {
  try {
    const { limit, force, companySlug, includeClosed } = req.body as {
      limit?: number;
      force?: boolean;
      companySlug?: string;
      includeClosed?: boolean;
    };

    const result = await enqueueTask("normal-filter-batch", {
      limit: Number.isFinite(Number(limit)) ? Number(limit) : 0,
      companySlug: companySlug || undefined,
      includeClosed: Boolean(includeClosed),
      force: Boolean(force),
    }, {
      force: Boolean(force),
      dedupeKey: `normal-filter-batch:${companySlug || "all"}:${Boolean(includeClosed)}:${Number(limit) || 0}`,
    });
    res.json({ ok: true, ...result });
  } catch (err: any) {
    sendError(res, err.message);
  }
});

router.post("/api/jobs/smart-filter-accepted", async (req: Request, res: Response) => {
  try {
    const { force } = req.body as { force?: boolean };
    const result = await enqueueTask(
      "smart-filter-accepted",
      { force: Boolean(force) },
      { force: Boolean(force), dedupeKey: "smart-filter-accepted" },
    );
    res.json({ ok: true, ...result });
  } catch (err: any) {
    sendError(res, err.message);
  }
});

router.get("/api/jobs/:jobId", async (req: Request, res: Response) => {
  try {
    const jobId = String(req.params.jobId);
    const job = await jobs.instance.getById(jobId);
    if (!job) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    const filters = await jobFilters.instance.getByJobId(jobId);
    const docs = await jobDocuments.instance.getByJobId(jobId);
    const app = await applications.instance.getByJobId(jobId);

    res.json({
      id: job.id,
      companySlug: job.companySlug,
      companyName: job.companyName,
      ats: job.ats,
      externalId: job.externalId,
      title: job.title,
      location: job.location,
      url: job.url,
      description: job.description,
      status: job.status,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      latestFilter: filters.length > 0 ? {
        id: filters[0].id,
        verdict: filters[0].verdict,
        score: filters[0].score,
        reasons: safeJsonParse(filters[0].reasons, []),
        mustHaveHits: safeJsonParse(filters[0].mustHaveHits, []),
        missingItems: safeJsonParse(filters[0].missingItems, []),
        createdAt: filters[0].createdAt,
      } : null,
      documents: docs.map((d: any) => ({
        id: d.id,
        type: d.type,
        status: d.status,
        content: d.content,
        filePath: d.filePath,
        createdAt: d.createdAt,
      })),
      application: app ? {
        id: app.id,
        status: app.status,
        score: app.score,
        documents: app.documents,
        notes: app.notes,
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
      } : null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/api/jobs/:jobId/documents/:documentId/download", async (req: Request, res: Response) => {
  try {
    const jobId = String(req.params.jobId);
    const documentId = String(req.params.documentId);
    const doc = (await jobDocuments.instance.getByJobId(jobId)).find((d: any) => d.id === documentId);

    if (!doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    if (!doc.filePath || !existsSync(doc.filePath)) {
      res.status(404).json({ error: "Document file not found" });
      return;
    }

    const fileName = basename(doc.filePath);
    const contentType = fileName.endsWith(".pdf")
      ? "application/pdf"
      : fileName.endsWith(".md")
        ? "text/markdown"
        : "application/octet-stream";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(readFileSync(doc.filePath));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/jobs/:jobId/refetch", async (req: Request, res: Response) => {
  try {
    const jobId = String(req.params.jobId);
    const result = await enqueueTask("refetch-job", { jobId }, { dedupeKey: `refetch-job:${jobId}` });
    res.json({ ok: true, jobId, ...result });
  } catch (err: any) {
    sendError(res, err.message);
  }
});

router.post("/api/jobs/:jobId/filter", async (req: Request, res: Response) => {
  try {
    const jobId = String(req.params.jobId);

    const jobRow = await jobs.instance.getById(jobId);
    if (!jobRow) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    const result = await enqueueTask("normal-filter-job", { jobId }, { dedupeKey: `normal-filter-job:${jobId}` });
    res.json({ ok: true, jobId, ...result });
  } catch (err: any) {
    sendError(res, err.message);
  }
});

router.post("/api/jobs/:jobId/smart-filter", async (req: Request, res: Response) => {
  try {
    const jobId = String(req.params.jobId);

    const jobRow = await jobs.instance.getById(jobId);
    if (!jobRow) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    const latestFilter = (await jobFilters.instance.getByJobId(jobId))[0];
    if (!latestFilter || latestFilter.verdict !== "accept") {
      res.status(400).json({ error: "Smart filter only runs after the normal filter accepts the job" });
      return;
    }

    const result = await enqueueTask("smart-filter-job", { jobId }, { dedupeKey: `smart-filter-job:${jobId}` });
    res.json({ ok: true, jobId, ...result });
  } catch (err: any) {
    sendError(res, err.message);
  }
});

router.post("/api/jobs/:jobId/documents", async (req: Request, res: Response) => {
  try {
    const jobId = String(req.params.jobId);
    const { type, force } = req.body as { type?: string; force?: boolean };

    if (!type || !["cv", "cover_letter", "recommendation"].includes(type)) {
      res.status(400).json({ error: "type must be cv, cover_letter, or recommendation" });
      return;
    }

    const jobRow = await jobs.instance.getById(jobId);
    if (!jobRow) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    const result = await enqueueTask(
      "generate-document",
      { jobId, documentType: type, force: Boolean(force) },
      { force: Boolean(force), dedupeKey: `generate-document:${jobId}:${type}` },
    );
    res.json({ ok: true, type, jobId, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/jobs/:jobId/application", async (req: Request, res: Response) => {
  try {
    const jobId = String(req.params.jobId);
    const jobRow = await jobs.instance.getById(jobId);
    if (!jobRow) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    const result = await enqueueTask("create-application", { jobId }, { dedupeKey: `create-application:${jobId}` });
    res.json({ ok: true, jobId, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

function safeJsonParse(val: string, fallback: unknown) {
  try { return JSON.parse(val); } catch { return fallback; }
}

export default router;

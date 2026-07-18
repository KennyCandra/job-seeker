import { Router, type Request, type Response } from "express";
import { basename } from "path";
import { existsSync, readFileSync } from "fs";
import { jobDocuments, jobs } from "../../db";
import { getSql } from "../../db/connection";
import { getJobDetail } from "../../db/queries";
import { sendError } from "../middleware/response";
import { enqueueTask } from "../../queue/enqueue";
import { ManualJobValidationError, saveManualJobFromText } from "../../jobs/manual";
import type { JobRecord } from "@shared/types";
import { createClient, JOBS_DIR } from "@shared/index";
import { generateCoverLetterDocument, generateCvDocument, generateRecommendationDocument } from "../../generator";
import { resolveContainedPath } from "../security/paths";

const router = Router();

router.get("/jobs", async (req: Request, res: Response) => {
  try {
    const result = await jobs.instance.search({
      page: Number(req.query.page) || 1,
      pageSize: Number(req.query.pageSize) || 50,
      search: String(req.query.search || ""),
      companyName: String(req.query.company || ""),
      status: String(req.query.status || ""),
      verdict: String(req.query.verdict || ""),
      smartVerdict: String(req.query.smartVerdict || ""),
      minScore: Number(req.query.minScore) || 0,
      fetchedWithinHours: Number(req.query.fetchedWithinHours) || 0,
    });

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/jobs/filter-candidates", async (req: Request, res: Response) => {
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

router.post("/jobs/smart-filter-accepted", async (req: Request, res: Response) => {
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

router.post("/jobs/manual", async (req: Request, res: Response) => {
  try {
    const { text } = req.body as { text?: string };
    const job = await saveManualJobFromText(String(text || ""));
    res.status(201).json({ ok: true, job });
  } catch (err: any) {
    if (err instanceof ManualJobValidationError) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: err.message });
  }
});

router.get("/jobs/:jobId", async (req: Request, res: Response) => {
  try {
    const jobId = String(req.params.jobId);
    const detail = await getJobDetail(getSql(), jobId);
    if (!detail) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    res.json(detail);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/jobs/:jobId/documents/:documentId/download", async (req: Request, res: Response) => {
  try {
    const jobId = String(req.params.jobId);
    const documentId = String(req.params.documentId);
    const doc = (await jobDocuments.instance.getByJobId(jobId)).find((d: any) => d.id === documentId);

    if (!doc) {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    const filePath = doc.filePath ? resolveContainedPath(JOBS_DIR, doc.filePath) : null;
    if (!filePath) {
      res.status(403).json({ error: "Invalid document path" });
      return;
    }

    if (!existsSync(filePath)) {
      res.status(404).json({ error: "Document file not found" });
      return;
    }

    const fileName = basename(filePath);
    const contentType = fileName.endsWith(".pdf")
      ? "application/pdf"
      : fileName.endsWith(".md")
        ? "text/markdown"
        : "application/octet-stream";

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(readFileSync(filePath));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/jobs/:jobId/refetch", async (req: Request, res: Response) => {
  try {
    const jobId = String(req.params.jobId);
    const result = await enqueueTask("refetch-job", { jobId }, { dedupeKey: `refetch-job:${jobId}` });
    res.json({ ok: true, jobId, ...result });
  } catch (err: any) {
    sendError(res, err.message);
  }
});

router.post("/jobs/:jobId/filter", async (req: Request, res: Response) => {
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

router.post("/jobs/:jobId/smart-filter", async (req: Request, res: Response) => {
  try {
    const jobId = String(req.params.jobId);

    const jobRow = await jobs.instance.getById(jobId);
    if (!jobRow) {
      res.status(404).json({ error: "Job not found" });
      return;
    }

    const result = await enqueueTask("smart-filter-job", { jobId }, { dedupeKey: `smart-filter-job:${jobId}` });
    res.json({ ok: true, jobId, ...result });
  } catch (err: any) {
    sendError(res, err.message);
  }
});

router.post("/jobs/:jobId/documents", async (req: Request, res: Response) => {
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

    const docType = String(type || "cv");

    const existingDocument = findLatestDocumentByType(await jobDocuments.instance.getByJobId(jobId), docType);
    if (existingDocument && !force) {
      res.json({
        ok: true,
        jobId,
        type: docType,
        exists: true,
        document: serializeDocument(jobId, existingDocument),
        message: `${formatDocumentType(docType)} already exists`,
      });
      return;
    }

    const job: JobRecord = {
      id: jobRow.id,
      site: jobRow.ats || "",
      title: jobRow.title,
      company: jobRow.companyName,
      location: jobRow.location,
      url: jobRow.url,
      description: jobRow.description,
    };
  
    const client = createClient();
  
    if (docType === "cv") {
      await generateCvDocument(job, client);
    } else if (docType === "cover_letter") {
      await generateCoverLetterDocument(job, client);
    } else {
      await generateRecommendationDocument(job, client);
    }

    const generatedDocument = findLatestDocumentByType(await jobDocuments.instance.getByJobId(jobId), docType);
    res.json({
      ok: true,
      jobId,
      type: docType,
      exists: false,
      document: generatedDocument ? serializeDocument(jobId, generatedDocument) : undefined,
      message: `${formatDocumentType(docType)} ${force ? "regenerated" : "generated"}`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/jobs/:jobId/application", async (req: Request, res: Response) => {
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

function findLatestDocumentByType(docs: any[], type: string) {
  return docs.find((d: any) => d.type === type);
}

function serializeDocument(jobId: string, doc: any) {
  return {
    id: doc.id,
    jobId: doc.jobId,
    type: doc.type,
    status: doc.status,
    content: doc.content,
    filePath: doc.filePath,
    downloadUrl: doc.filePath
      ? `/api/jobs/${encodeURIComponent(jobId)}/documents/${encodeURIComponent(doc.id)}/download`
      : null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function formatDocumentType(type: string) {
  if (type === "cv") return "CV";
  if (type === "cover_letter") return "Cover letter";
  if (type === "recommendation") return "Recommendation";
  return "Document";
}

export default router;

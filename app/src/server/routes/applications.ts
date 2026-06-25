import { Router, type Request, type Response } from "express";
import { join } from "path";
import { existsSync, readFileSync, readdirSync } from "fs";
import { applications, jobDocuments, savedJobs } from "../../db";
import { JOBS_DIR, slug, createClient } from "../../shared/index";
import { applications as applicationTable, companies, jobs } from "../../db/schema";
import { makeCvForJob } from "../../generator/index";
import type { AppStatus, JobRecord } from "../../shared/types";
import { sseSetup, sseSend } from "../middleware/sse";
import { db } from "../../db";
import { and, desc, eq, lt, or } from "drizzle-orm";
import { resolveContainedPath } from "../security/paths";

const router = Router();
const APPLICATIONS_PAGE_SIZE = 25;

router.get("/applications", async (req: Request, res: Response) => {
  try {
    const cursorId = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
    const cursorRow = cursorId
      ? await db
          .select({ id: applicationTable.id, createdAt: applicationTable.createdAt })
          .from(applicationTable)
          .where(eq(applicationTable.id, cursorId))
          .limit(1)
          .then((rows) => rows[0])
      : undefined;

    const rows = await db
      .select({
        id: applicationTable.id,
        jobId: applicationTable.jobId,
        score: applicationTable.score,
        status: applicationTable.status,
        documents: applicationTable.documents,
        notes: applicationTable.notes,
        createdAt: applicationTable.createdAt,
        updatedAt: applicationTable.updatedAt,
        company: companies.name,
        title: jobs.title,
        location: jobs.location,
        site: companies.ats,
        url: jobs.url,
      })
      .from(applicationTable)
      .innerJoin(jobs, eq(applicationTable.jobId, jobs.id))
      .innerJoin(companies, eq(jobs.companyId, companies.id))
      .where(cursorRow
        ? or(
            lt(applicationTable.createdAt, cursorRow.createdAt),
            and(eq(applicationTable.createdAt, cursorRow.createdAt), lt(applicationTable.id, cursorRow.id)),
          )
        : undefined)
      .orderBy(desc(applicationTable.createdAt), desc(applicationTable.id))
      .limit(APPLICATIONS_PAGE_SIZE + 1);

    const items = rows.slice(0, APPLICATIONS_PAGE_SIZE);
    const last = items.at(-1);
    res.json({
      items,
      nextCursor: rows.length > APPLICATIONS_PAGE_SIZE && last ? last.id : null,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch(
  "/applications/:jobId/status",
  async (req: Request, res: Response) => {
    try {
      const jobId = String(req.params.jobId);
      const { status } = req.body as { status: AppStatus };
      const valid: AppStatus[] = [
        "approved",
        "ready",
        "applied",
        "interviewing",
        "offer",
        "rejected",
        "ghosted",
        "withdrawn",
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
  },
);

router.delete(
  "/applications/:jobId",
  async (req: Request, res: Response) => {
    try {
      await applications.instance.delete(String(req.params.jobId));
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

router.get(
  "/applications/:jobId/pdf",
  async (req: Request, res: Response) => {
    try {
      const appRow = await applications.instance.getByJobId(
        String(req.params.jobId),
      );
      if (!appRow) {
        res.status(404).json({ error: "Application not found" });
        return;
      }

      const cvDocument = (await jobDocuments.instance.getByJobId(appRow.jobId))
        .find((doc: any) => doc.type === "cv" && doc.filePath);
      if (!cvDocument) {
        res.status(404).json({ error: "No PDF found" });
        return;
      }

      const pdfPath = resolveContainedPath(JOBS_DIR, cvDocument.filePath);
      if (!pdfPath) {
        res.status(403).json({ error: "Invalid document path" });
        return;
      }

      if (!existsSync(pdfPath)) {
        res.status(404).json({ error: "PDF file not found" });
        return;
      }

      const pdfData = readFileSync(pdfPath);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${pdfPath.split(/[\\/]/).at(-1) || "cv.pdf"}"`,
      );
      res.send(pdfData);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

router.post(
  "/applications/:jobId/generate",
  (req: Request, res: Response) => {
    sseSetup(res);

    (async () => {
      try {
        const jobId = String(req.params.jobId);
        const force = req.query.force === "true";
        const appRow = await applications.instance.getByJobId(jobId);
        if (!appRow) {
          sseSend(res, "log", {
            type: "error",
            message: "Application not found",
          });
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
          sseSend(res, "done", {
            exists: true,
            pdfPath: `/api/applications/${jobId}/pdf`,
          });
          res.end();
          return;
        }

        const job: JobRecord = {
          id: jobId,
          site: appRow.site,
          title: appRow.title,
          company: appRow.company,
          location: appRow.location,
          url: appRow.url,
          description: saved?.description || "",
        };

        sseSend(res, "log", {
          type: "info",
          message: `Generating CV for ${job.company} — ${job.title}...`,
        });

        const client = createClient();
        await makeCvForJob(job, appRow.score, client);

        const pdfFiles = (() => {
          try {
            const dir = join(JOBS_DIR, companySlug);
            return readdirSync(dir).filter((f) => f.endsWith(".pdf"));
          } catch {
            return [];
          }
        })();

        sseSend(res, "log", {
          type: "done",
          message: "CV generated successfully",
        });
        sseSend(res, "done", {
          pdfPath:
            pdfFiles.length > 0 ? `/api/applications/${jobId}/pdf` : null,
          company: job.company,
        });
      } catch (err: any) {
        sseSend(res, "log", { type: "error", message: err.message });
        sseSend(res, "done", { error: err.message });
      }
      res.end();
    })();
  },
);

export default router;

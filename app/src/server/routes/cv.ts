import { Router, type Request, type Response } from "express";
import { join } from "path";
import { existsSync, readdirSync, writeFileSync } from "fs";
import { sseSetup, sseSend } from "../middleware/sse";
import { JOBS_DIR, slug, createClient } from "../../shared/index";
import { shortlist, applications } from "../../db";
import { makeCvForJob } from "../../generator/index";
import type { JobRecord } from "../../shared/types";

const router = Router();

router.post("/api/cv/generate", (req: Request, res: Response) => {
  sseSetup(res);

  (async () => {
    try {
      const body = req.body as { jobId?: string; job?: JobRecord };
      let job: JobRecord | null = null;

      if (body.job) {
        job = body.job;
      } else if (body.jobId) {
        const item = await shortlist.instance.getByJobId(body.jobId);
        if (item) {
          job = {
            id: body.jobId, site: "", title: item.title,
            company: item.company, location: item.location,
            url: item.applyUrl, description: "",
          };
        } else {
          sseSend(res, "log", { type: "error", message: "Job not found" });
          sseSend(res, "done", { error: "Job not found" });
          res.end();
          return;
        }
      }

      if (!job) {
        sseSend(res, "log", { type: "error", message: "jobId or job body required" });
        sseSend(res, "done", { error: "jobId or job body required" });
        res.end();
        return;
      }

      sseSend(res, "log", { type: "info", message: `Generating CV for ${job.company} — ${job.title}...` });

      const client = createClient();
      const resume = await makeCvForJob(job, 100, client);
      const pdfFiles = (() => {
        try {
          const dir = join(JOBS_DIR, slug(job.company));
          return readdirSync(dir).filter((f) => f.endsWith(".pdf"));
        } catch { return []; }
      })();

      sseSend(res, "log", { type: "done", message: "CV generated successfully" });
      sseSend(res, "done", {
        pdfPath: pdfFiles.length > 0 ? `/api/applications/${job.id}/pdf` : null,
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

import { Router, type Request, type Response } from "express";
import { join } from "path";
import { SKILLS_DIR, createClient } from "../../shared/index";
import { readText } from "../../shared/utils";
import { loadSearchConfig } from "../../shared/config";
import { applications, companies, savedJobs, jobFilters } from "../../db";
import { filterJob } from "../../filter/index";
import type { JobRecord } from "../../shared/types";
import { sendError } from "../middleware/response";

const router = Router();

router.get("/api/saved-jobs", (_req: Request, res: Response) => {
  try {
    const all = savedJobs.instance.getAll();
    const processedIds = new Set(applications.instance.getProcessedJobIds());
    const withStatus = all.map((j) => ({ ...j, processed: processedIds.has(j.jobId) }));
    res.json(withStatus);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/api/saved-jobs/:company", (req: Request, res: Response) => {
  try {
    const jobs = savedJobs.instance.getByCompany(String(req.params.company));
    const processedIds = new Set(applications.instance.getProcessedJobIds());
    const withStatus = jobs.map((j) => ({ ...j, processed: processedIds.has(j.jobId) }));
    res.json(withStatus);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/saved-jobs/:companySlug/:jobId/filter", async (req: Request, res: Response) => {
  try {
    const companySlug = String(req.params.companySlug);
    const jobId = String(req.params.jobId);
    const saved = savedJobs.instance.get(companySlug, jobId);
    if (!saved) return sendError(res, "Saved job not found", 404);

    const company = companies.instance.getBySlug(companySlug);
    const companyName = company?.name || companySlug;

    const job: JobRecord = {
      id: jobId, site: "", title: saved.title,
      company: companyName, location: saved.location,
      url: saved.url, description: saved.description,
    };

    const config = loadSearchConfig();
    const client = createClient();
    const filterMd = readText(join(SKILLS_DIR, "job_filter.md"));
    const result = await filterJob(client, job, filterMd, config.targetCompanies);

    if (!result) {
      return res.json({ accepted: false, error: "Filter failed" });
    }

    jobFilters.instance.save({
      id: `filter-${jobId}-${Date.now()}`,
      jobId,
      verdict: result.filter.verdict,
      score: result.filter.score,
      reasons: result.filter.reasons,
      mustHaveHits: result.filter.must_have_hits,
      missingItems: result.filter.missing,
    });

    res.json({
      accepted: result.filter.verdict === "accept",
      score: result.filter.score,
      reasons: result.filter.reasons,
      mustHaveHits: result.filter.must_have_hits,
      missing: result.filter.missing,
    });
  } catch (err: any) {
    sendError(res, err.message);
  }
});

export default router;
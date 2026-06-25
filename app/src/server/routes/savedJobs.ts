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

router.get("/saved-jobs", async (req: Request, res: Response) => {
  try {
    const limit = parseLegacyLimit(req.query.limit);
    const all = await savedJobs.instance.getAll(limit);
    const processedIds = new Set(await applications.instance.getProcessedJobIdsFor(all.map((job) => job.jobId)));
    const withStatus = all.map((j) => ({ ...j, processed: processedIds.has(j.jobId) }));
    res.json(withStatus);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/saved-jobs/:company", async (req: Request, res: Response) => {
  try {
    const limit = parseLegacyLimit(req.query.limit);
    const jobsList = await savedJobs.instance.getByCompany(String(req.params.company), limit);
    const processedIds = new Set(await applications.instance.getProcessedJobIdsFor(jobsList.map((job) => job.jobId)));
    const withStatus = jobsList.map((j) => ({ ...j, processed: processedIds.has(j.jobId) }));
    res.json(withStatus);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/saved-jobs/:companySlug/:jobId/filter", async (req: Request, res: Response) => {
  try {
    const companySlug = String(req.params.companySlug);
    const jobId = String(req.params.jobId);
    const saved = await savedJobs.instance.get(companySlug, jobId);
    if (!saved) return sendError(res, "Saved job not found", 404);

    const company = await companies.instance.getBySlug(companySlug);
    const companyName = company?.name || companySlug;

    const job: JobRecord = {
      id: jobId, site: "", title: saved.title,
      company: companyName, location: saved.location,
      url: saved.url, description: saved.description,
    };

    const config = await loadSearchConfig();
    const client = createClient();
    const filterMd = readText(join(SKILLS_DIR, "job_filter.md"));
    const result = await filterJob(client, job, filterMd, config.targetCompanies);

    if (!result) {
      return res.json({ accepted: false, error: "Filter failed" });
    }

    await jobFilters.instance.save({
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

function parseLegacyLimit(value: unknown): number {
  const limit = Number(value);
  return Number.isFinite(limit) ? Math.min(100, Math.max(1, Math.floor(limit))) : 100;
}

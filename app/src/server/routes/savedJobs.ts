import { Router, type Request, type Response } from "express";
import { join } from "path";
import { SKILLS_DIR, createClient } from "../../shared/index";
import { readText } from "../../shared/utils";
import { loadSearchConfig } from "../../shared/config";
import { applications, companies, savedJobs } from "../../db";
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
    const jobs = savedJobs.instance.getByCompany(req.params.company);
    const processedIds = new Set(applications.instance.getProcessedJobIds());
    const withStatus = jobs.map((j) => ({ ...j, processed: processedIds.has(j.jobId) }));
    res.json(withStatus);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/saved-jobs/:companySlug/:jobId/filter", async (req: Request, res: Response) => {
  try {
    const { companySlug, jobId } = req.params;
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

    const status = result.filter.verdict === "accept" && result.filter.score >= config.min_score ? "ready" : "rejected";
    const filterDoc = JSON.stringify({ filter: result.filter });

    applications.instance.saveAcceptedJob({
      jobId, company: companyName, title: saved.title,
      location: saved.location, site: "", url: saved.url,
      score: result.filter.score, status, documents: filterDoc,
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

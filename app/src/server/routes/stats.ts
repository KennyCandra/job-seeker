import { Router, type Request, type Response } from "express";
import { getSql } from "../../db/connection";

const router = Router();

router.get("/stats", async (_req: Request, res: Response) => {
  try {
    const [row] = await getSql().unsafe(`
      SELECT
        (SELECT COUNT(*)::int FROM companies) AS companies,
        (SELECT COUNT(*)::int FROM jobs) AS jobs,
        (SELECT COUNT(*)::int FROM jobs WHERE status = 'open') AS "openJobs",
        (SELECT COUNT(*)::int FROM jobs WHERE status = 'closed') AS "closedJobs",
        (SELECT COUNT(DISTINCT job_id)::int FROM job_filters) AS shortlist,
        (SELECT COUNT(*)::int FROM applications) AS applications,
        (SELECT COUNT(*)::int FROM job_documents) AS "docsGenerated",
        (SELECT COUNT(*)::int FROM job_documents WHERE type = 'cv') AS "cvCount",
        (SELECT COUNT(*)::int FROM job_documents WHERE type = 'cover_letter') AS "coverLetterCount",
        (SELECT COUNT(*)::int FROM job_documents WHERE type = 'recommendation') AS "recommendationCount"
    `);

    const jobs = Number(row?.jobs || 0);
    res.json({
      companies: Number(row?.companies || 0),
      jobs,
      openJobs: Number(row?.openJobs || 0),
      closedJobs: Number(row?.closedJobs || 0),
      shortlist: Number(row?.shortlist || 0),
      applications: Number(row?.applications || 0),
      savedJobs: jobs,
      docsGenerated: Number(row?.docsGenerated || 0),
      cvCount: Number(row?.cvCount || 0),
      coverLetterCount: Number(row?.coverLetterCount || 0),
      recommendationCount: Number(row?.recommendationCount || 0),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

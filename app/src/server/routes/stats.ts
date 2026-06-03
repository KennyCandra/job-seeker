import { Router, type Request, type Response } from "express";
import { applications, companies, shortlist, savedJobs } from "../../db";

const router = Router();

router.get("/api/stats", (_req: Request, res: Response) => {
  try {
    const allApps = applications.instance.getAll();
    const shortlistItems = shortlist.instance.getAll();
    const allCompanies = companies.instance.getAll();
    const savedJobsList = savedJobs.instance.getAll();
    res.json({
      companies: allCompanies.length,
      shortlist: shortlistItems.length,
      applications: allApps.length,
      savedJobs: savedJobsList.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

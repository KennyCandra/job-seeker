import { Router, type Request, type Response } from "express";
import { applications, companies, shortlist, savedJobs, jobDocuments } from "../../db";

const router = Router();

router.get("/api/stats", (_req: Request, res: Response) => {
  try {
    const allApps = applications.instance.getAll();
    const shortlistItems = shortlist.instance.getAll();
    const allCompanies = companies.instance.getAll();
    const savedJobsList = savedJobs.instance.getAll();

    const openJobs = savedJobsList.filter((j) => j.status === "open").length;
    const closedJobs = savedJobsList.filter((j) => j.status === "closed").length;

    // Count unique jobs with documents per type
    const allDocs = savedJobsList.flatMap((j) => jobDocuments.instance.getByJobId(j.id));
    const docsGenerated = allDocs.length;
    const cvCount = allDocs.filter((d: any) => d.type === "cv").length;
    const coverLetterCount = allDocs.filter((d: any) => d.type === "cover_letter").length;
    const recommendationCount = allDocs.filter((d: any) => d.type === "recommendation").length;

    res.json({
      companies: allCompanies.length,
      jobs: savedJobsList.length,
      openJobs,
      closedJobs,
      shortlist: shortlistItems.length,
      applications: allApps.length,
      savedJobs: savedJobsList.length,
      docsGenerated,
      cvCount,
      coverLetterCount,
      recommendationCount,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
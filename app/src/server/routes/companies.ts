import { Router, type Request, type Response } from "express";
import { companies } from "../../db";
import type { AtsPlatform } from "../../shared/types";
import { enqueueTask } from "../../queue/enqueue";

const router = Router();

router.get("/api/companies", (_req: Request, res: Response) => {
  try {
    const all = companies.instance.getAll();
    res.json(all);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/companies/discover", async (_req: Request, res: Response) => {
  try {
    const result = await enqueueTask("discover-companies", {}, { dedupeKey: "discover-companies" });
    res.json({ ok: true, ...result });
  } catch (err: any) {
    console.error(`[discovery] API discover failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/companies", (req: Request, res: Response) => {
  try {
    const { name, ats, boardUrl, endpoint } = req.body as { name: string; ats: AtsPlatform; boardUrl?: string; endpoint?: string };
    if (!name || !ats) { res.status(400).json({ error: "name and ats required" }); return; }
    const ok = companies.instance.save({ name, ats, endpoint: endpoint || boardUrl });
    res.status(201).json({ ok });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/api/companies/:slug/active", (req: Request, res: Response) => {
  try {
    const companySlug = String(req.params.slug);
    const { active } = req.body as { active: boolean };
    if (active) companies.instance.reactivate(companySlug);
    else companies.instance.deactivate(companySlug);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/api/companies/:slug", (req: Request, res: Response) => {
  try {
    companies.instance.deactivate(String(req.params.slug));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/companies/:slug/fetch", async (req: Request, res: Response) => {
  try {
    const companySlug = String(req.params.slug);
    const { filter: doFilter } = req.body as { filter?: boolean };

    const company = companies.instance.getBySlug(companySlug);
    if (!company) {
      res.status(404).json({ error: "Company not found" });
      return;
    }

    const result = await enqueueTask(
      "sync-company",
      { companySlug, filter: Boolean(doFilter) },
      { dedupeKey: `sync-company:${companySlug}:${Boolean(doFilter)}` },
    );
    res.json({ ok: true, company: company.name, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

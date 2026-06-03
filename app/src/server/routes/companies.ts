import { Router, type Request, type Response } from "express";
import { companies } from "../../db";
import type { AtsPlatform } from "../../shared/types";

const router = Router();

router.get("/api/companies", (_req: Request, res: Response) => {
  try {
    const all = companies.instance.getAll();
    res.json(all);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/companies", (req: Request, res: Response) => {
  try {
    const { name, ats, boardUrl } = req.body as { name: string; ats: AtsPlatform; boardUrl?: string };
    if (!name || !ats) { res.status(400).json({ error: "name and ats required" }); return; }
    const ok = companies.instance.save({ name, ats, boardUrl });
    res.status(201).json({ ok });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/api/companies/:slug/active", (req: Request, res: Response) => {
  try {
    const { active } = req.body as { active: boolean };
    if (active) companies.instance.reactivate(req.params.slug);
    else companies.instance.deactivate(req.params.slug);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/api/companies/:slug", (req: Request, res: Response) => {
  try {
    companies.instance.deactivate(req.params.slug);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

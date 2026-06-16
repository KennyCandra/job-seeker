import { Router, type Request, type Response } from "express";
import { shortlist } from "../../db";

const router = Router();

router.get("/api/shortlist", (_req: Request, res: Response) => {
  try {
    const items = shortlist.instance.getAll();
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/api/shortlist/:jobId", (req: Request, res: Response) => {
  try {
    shortlist.instance.delete(String(req.params.jobId));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

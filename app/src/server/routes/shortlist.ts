import { Router, type Request, type Response } from "express";
import { shortlist } from "../../db";

const router = Router();

router.get("/shortlist", async (_req: Request, res: Response) => {
  try {
    const items = await shortlist.instance.getAll();
    res.json(items);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/shortlist/:jobId", async (req: Request, res: Response) => {
  try {
    await shortlist.instance.delete(String(req.params.jobId));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

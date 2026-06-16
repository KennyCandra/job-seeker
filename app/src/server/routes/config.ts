import { Router, type Request, type Response } from "express";
import { loadSearchConfig, saveSearchConfig } from "../../shared/config";
import type { SearchConfig } from "../../shared/types";

const router = Router();

router.get("/api/config", async (_req: Request, res: Response) => {
  try {
    const config = await loadSearchConfig();
    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/api/config", async (req: Request, res: Response) => {
  try {
    const config = req.body as SearchConfig;
    await saveSearchConfig(config);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

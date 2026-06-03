import { Router, type Request, type Response } from "express";
import { loadSearchConfig, saveSearchConfig } from "../../shared/config";
import type { SearchConfig } from "../../shared/types";

const router = Router();

router.get("/api/config", (_req: Request, res: Response) => {
  try {
    const config = loadSearchConfig();
    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/api/config", (req: Request, res: Response) => {
  try {
    const config = req.body as SearchConfig;
    saveSearchConfig(config);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

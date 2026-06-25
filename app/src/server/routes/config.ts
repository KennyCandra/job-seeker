import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { loadSearchConfig, saveSearchConfig } from "../../shared/config";

const searchConfigSchema = z.object({
  roles: z.array(z.string()),
  location: z.array(z.string()),
  exclude: z.array(z.string()),
  ats: z.array(z.string()),
  min_score: z.number().min(0).max(100),
  discovery_interval_hours: z.number().min(0),
  targetCompanies: z.array(z.string()),
});

const router = Router();

router.get("/config", async (_req: Request, res: Response) => {
  try {
    const config = await loadSearchConfig();
    res.json(config);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/config", async (req: Request, res: Response) => {
  try {
    const parsed = searchConfigSchema.parse(req.body);
    await saveSearchConfig(parsed);
    res.json({ ok: true });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.issues });
      return;
    }
    res.status(500).json({ error: err.message });
  }
});

export default router;

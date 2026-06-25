import { Router, type Request, type Response } from "express";
import { extractJobFromText } from "../../shared/documents";

const router = Router();

router.post("/job/extract", async (req: Request, res: Response) => {
  try {
    const { text } = req.body as { text: string };
    if (!text) { res.status(400).json({ error: "text body required" }); return; }
    const job = await extractJobFromText(text);
    res.json(job);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

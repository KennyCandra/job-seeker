import { Router, type Request, type Response } from "express";
import { userProfile, userAnswers } from "../../db";

const router = Router();

router.get("/api/profile", async (_req: Request, res: Response) => {
  try {
    const profile = await userProfile.instance.get();
    if (!profile) {
      res.json({ ok: true, profile: null });
      return;
    }
    res.json({ ok: true, profile });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/api/profile", async (req: Request, res: Response) => {
  try {
    await userProfile.instance.upsert(req.body);
    const profile = await userProfile.instance.get();
    res.json({ ok: true, profile });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/api/profile/answers", async (_req: Request, res: Response) => {
  try {
    const answers = await userAnswers.instance.getAll();
    res.json({ ok: true, answers });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/profile/answers", async (req: Request, res: Response) => {
  try {
    const { category, question, answer, tagsJson } = req.body as {
      category: string;
      question: string;
      answer: string;
      tagsJson?: string;
    };
    if (!category || !question || !answer) {
      res.status(400).json({ error: "category, question, and answer required" });
      return;
    }
    const id = await userAnswers.instance.create({ category, question, answer, tagsJson });
    const created = await userAnswers.instance.getById(id);
    res.status(201).json({ ok: true, answer: created });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/api/profile/answers/:id", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    await userAnswers.instance.update(id, req.body);
    const updated = await userAnswers.instance.getById(id);
    res.json({ ok: true, answer: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/api/profile/answers/:id", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    await userAnswers.instance.delete(id);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

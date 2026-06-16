import { Router, type Request, type Response } from "express";
import { userProfile, userAnswers } from "../../db";

const router = Router();

router.get("/api/profile", (_req: Request, res: Response) => {
  try {
    const profile = userProfile.instance.get();
    if (!profile) {
      res.json({ ok: true, profile: null });
      return;
    }
    res.json({ ok: true, profile });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/api/profile", (req: Request, res: Response) => {
  try {
    userProfile.instance.upsert(req.body);
    const profile = userProfile.instance.get();
    res.json({ ok: true, profile });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/api/profile/answers", (_req: Request, res: Response) => {
  try {
    const answers = userAnswers.instance.getAll();
    res.json({ ok: true, answers });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/api/profile/answers", (req: Request, res: Response) => {
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
    const id = userAnswers.instance.create({ category, question, answer, tagsJson });
    const created = userAnswers.instance.getById(id);
    res.status(201).json({ ok: true, answer: created });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/api/profile/answers/:id", (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    userAnswers.instance.update(id, req.body);
    const updated = userAnswers.instance.getById(id);
    res.json({ ok: true, answer: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/api/profile/answers/:id", (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    userAnswers.instance.delete(id);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

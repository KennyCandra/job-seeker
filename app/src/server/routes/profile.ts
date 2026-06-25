import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { userProfile, userAnswers } from "../../db";

const profileSchema = z.object({
  fullName: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  location: z.string().optional(),
  linkedin: z.string().optional(),
  portfolio: z.string().optional(),
  github: z.string().optional(),
  headline: z.string().optional(),
  summary: z.string().optional(),
  skillsJson: z.string().optional(),
  experienceJson: z.string().optional(),
  projectsJson: z.string().optional(),
  educationJson: z.string().optional(),
  preferencesJson: z.string().optional(),
});

const router = Router();

router.get("/profile", async (_req: Request, res: Response) => {
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

router.put("/profile", async (req: Request, res: Response) => {
  try {
    const parsed = profileSchema.parse(req.body);
    await userProfile.instance.upsert(parsed);
    const profile = await userProfile.instance.get();
    res.json({ ok: true, profile });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: err.issues });
      return;
    }
    res.status(500).json({ error: err.message });
  }
});

router.get("/profile/answers", async (_req: Request, res: Response) => {
  try {
    const answers = await userAnswers.instance.getAll();
    res.json({ ok: true, answers });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/profile/answers", async (req: Request, res: Response) => {
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

router.put("/profile/answers/:id", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    await userAnswers.instance.update(id, req.body);
    const updated = await userAnswers.instance.getById(id);
    res.json({ ok: true, answer: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/profile/answers/:id", async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    await userAnswers.instance.delete(id);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

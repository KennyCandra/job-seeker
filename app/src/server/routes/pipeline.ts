import { Router, type Request, type Response } from "express";
import { enqueueTask } from "../../queue/enqueue";
import { sseTaskEvents } from "../../tasks/sse";

const router = Router();

router.get("/pipeline/run", (req: Request, res: Response) => {
  (async () => {
    try {
      const result = await enqueueTask("sync-all-jobs", {}, { dedupeKey: "sync-all-jobs" });
      await sseTaskEvents(res, result.runId);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  })();
});

router.get("/pipeline/discover", (req: Request, res: Response) => {
  (async () => {
    try {
      const result = await enqueueTask("discover-companies", {}, { dedupeKey: "discover-companies" });
      await sseTaskEvents(res, result.runId);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  })();
});

router.get("/pipeline/discover-and-process", (req: Request, res: Response) => {
  (async () => {
    try {
      const result = await enqueueTask("discover-fetch-filter", {}, { dedupeKey: "discover-fetch-filter" });
      await sseTaskEvents(res, result.runId);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  })();
});

export default router;

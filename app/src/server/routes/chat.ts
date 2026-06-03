import { Router, type Request, type Response } from "express";
import { sseSetup, sseSend } from "../middleware/sse";
import { createClient } from "../../shared/client";

const router = Router();

router.post("/api/chat", (req: Request, res: Response) => {
  sseSetup(res);

  (async () => {
    try {
      const { message } = req.body as { message: string };
      const client = createClient();
      const response = await client.completeJson(
        "You are a helpful job hunting assistant. Be concise.",
        message,
      );
      sseSend(res, "chunk", { text: response });
      sseSend(res, "done", {});
    } catch (err: any) {
      sseSend(res, "log", { type: "error", message: err.message });
      sseSend(res, "done", { error: err.message });
    }
    res.end();
  })();
});

export default router;

import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { Router } from "express";
import { Queue } from "bullmq";
import { getQueueConnection, getQueueName } from "../../queue/connection";
import { requireLocalOrAdmin } from "../middleware/adminGuard";

const serverAdapter = new ExpressAdapter();
const basePath = "/admin/queues";
const router = Router();

serverAdapter.setBasePath(basePath);

if (process.env.ENABLE_QUEUE_ADMIN === "true") {
  const queue = new Queue(getQueueName(), { connection: getQueueConnection() });

  createBullBoard({
    queues: [new BullMQAdapter(queue)],
    serverAdapter,
  });

  router.use(requireLocalOrAdmin, serverAdapter.getRouter());
} else {
  router.use((_req, res) => {
    res.status(404).json({ error: "Queue admin is disabled" });
  });
}

export const queuesAdminBasePath = basePath;
export const queuesAdminRouter = router;

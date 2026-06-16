import { createBullBoard } from "@bull-board/api";
import { BullMQAdapter } from "@bull-board/api/bullMQAdapter";
import { ExpressAdapter } from "@bull-board/express";
import { Queue } from "bullmq";
import { getQueueConnection, getQueueName } from "../../queue/connection";

const serverAdapter = new ExpressAdapter();
const basePath = "/admin/queues";

serverAdapter.setBasePath(basePath);

const queue = new Queue(getQueueName(), { connection: getQueueConnection() });

createBullBoard({
  queues: [new BullMQAdapter(queue)],
  serverAdapter,
});

export const queuesAdminBasePath = basePath;
export const queuesAdminRouter = serverAdapter.getRouter();

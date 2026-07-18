import { Queue } from "bullmq";
import { env } from "../src/config/env";

const q = new Queue(env.TASK_QUEUE_NAME, { connection: { url: env.REDIS_URL } });
const waiting = await q.getJobs(["waiting", "delayed", "prioritized"], 0, 5000);
let removed = 0;
for (const job of waiting) {
  if (job.data?.type === "detect-migration") {
    await job.remove();
    removed++;
  }
}
console.log(`removed ${removed} detect-migration jobs; counts now:`, await q.getJobCounts());
await q.close();

import { describe, it, expect } from "bun:test";
import { TaskQueueService } from "../src/tasks/task-queue.service";

/**
 * Guards the enqueue ordering fix: the task_runs row must be committed BEFORE
 * the Bull job is added, or an idle worker can pick up the job and query for a
 * row that isn't visible yet (getById → not found → job dropped, row stranded).
 */
describe("TaskQueueService.enqueueTask ordering", () => {
  function makeService() {
    const order: string[] = [];
    let createdRow: any = null;
    const taskRuns = {
      async findActiveByDedupeKey() {
        return undefined;
      },
      async create(input: any) {
        order.push("create");
        createdRow = input;
      },
    };
    const queue = {
      async add(_name: string, _data: unknown, opts: any) {
        order.push("queue.add");
        return { id: opts.jobId };
      },
      async getJob() {
        return null;
      },
    };
    const svc = new TaskQueueService(queue as any, taskRuns as any, {} as any);
    return { svc, order, getRow: () => createdRow };
  }

  it("creates (commits) the row before adding the Bull job", async () => {
    const { svc, order } = makeService();
    await svc.enqueueTask("sync-company", { companySlug: "x" }, { dedupeKey: "k" });
    expect(order).toEqual(["create", "queue.add"]);
  });

  it("records the deterministic bullJobId on the row up front (not null)", async () => {
    const { svc, getRow } = makeService();
    const { runId, bullJobId } = await svc.enqueueTask("sync-company", { companySlug: "x" }, { dedupeKey: "k" });
    const row = getRow();
    expect(row.bullJobId).toBe(runId); // jobId defaults to runId
    expect(bullJobId).toBe(runId);
    expect(row.status).toBe("queued");
  });
});

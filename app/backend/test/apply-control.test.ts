import { describe, it, expect, afterAll } from "bun:test";
import { ApplyControlService } from "../src/apply/apply-control.service";

const fakeConfig = { get: (key: string) => (key === "REDIS_URL" ? process.env.REDIS_URL || "redis://localhost:6379" : undefined) } as any;

describe("ApplyControlService (real Redis pub/sub)", () => {
  const services: ApplyControlService[] = [];
  afterAll(async () => {
    await Promise.all(services.map((s) => s.onModuleDestroy()));
  });

  it("delivers a resume control message published by one instance (API) to a listener on another (worker)", async () => {
    const apiSide = new ApplyControlService(fakeConfig);
    const workerSide = new ApplyControlService(fakeConfig);
    services.push(apiSide, workerSide);

    const received = await new Promise<string>(async (resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("timed out waiting for control message")), 8000);
      workerSide.onControl("run-abc", (action) => {
        clearTimeout(timeout);
        resolve(action);
      });
      // give the subscribe() call a moment to actually register with Redis
      // before publishing, mirroring how a worker boots before the API acts.
      await new Promise((r) => setTimeout(r, 300));
      await apiSide.publish({ runId: "run-abc", action: "resume" });
    });

    expect(received).toBe("resume");
  }, 15000);

  it("only dispatches to the handler registered for the matching runId", async () => {
    const apiSide = new ApplyControlService(fakeConfig);
    const workerSide = new ApplyControlService(fakeConfig);
    services.push(apiSide, workerSide);

    let otherRunFired = false;
    workerSide.onControl("run-other", () => {
      otherRunFired = true;
    });

    const received = await new Promise<string>(async (resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("timed out")), 8000);
      workerSide.onControl("run-target", (action) => {
        clearTimeout(timeout);
        resolve(action);
      });
      await new Promise((r) => setTimeout(r, 300));
      await apiSide.publish({ runId: "run-target", action: "cancel" });
    });

    expect(received).toBe("cancel");
    expect(otherRunFired).toBe(false);
  }, 15000);

  it("stops dispatching after offControl is called", async () => {
    const apiSide = new ApplyControlService(fakeConfig);
    const workerSide = new ApplyControlService(fakeConfig);
    services.push(apiSide, workerSide);

    let calls = 0;
    workerSide.onControl("run-unsub", () => {
      calls += 1;
    });
    workerSide.offControl("run-unsub");

    await new Promise((r) => setTimeout(r, 300));
    await apiSide.publish({ runId: "run-unsub", action: "cancel" });
    await new Promise((r) => setTimeout(r, 500));

    expect(calls).toBe(0);
  }, 15000);
});

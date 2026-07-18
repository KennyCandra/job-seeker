import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import { detectAtsMigration } from "../src/jobs/ats/migration-probe";

const originalFetch = globalThis.fetch;

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("detectAtsMigration", () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("detects Amplemarket moved from ashby to greenhouse: exactly one successful fetch, others 404", async () => {
    const calls: string[] = [];
    globalThis.fetch = (async (input: any) => {
      const url = String(input);
      calls.push(url);
      if (url.includes("boards-api.greenhouse.io")) {
        return jsonResponse(200, { jobs: [{ id: 1, title: "Engineer" }, { id: 2, title: "Designer" }] });
      }
      throw new Error(`unexpected probe of ${url} — greenhouse should match first and short-circuit`);
    }) as any;

    const { match, attempts } = await detectAtsMigration("amplemarket", "ashby");

    expect(match).not.toBeNull();
    expect(match!.ats).toBe("greenhouse");
    expect(match!.endpoint).toContain("boards-api.greenhouse.io");
    expect(match!.rawJobs).toHaveLength(2);

    // exactly one successful greenhouse fetch — no retry/duplicate request
    const greenhouseCalls = calls.filter((u) => u.includes("greenhouse"));
    expect(greenhouseCalls).toHaveLength(1);

    // ashby (prevAts) must never be probed
    expect(calls.some((u) => u.includes("ashbyhq"))).toBe(false);

    // stops at the first valid match — lever is never even tried
    expect(attempts).toHaveLength(1);
    expect(attempts[0]).toEqual({ ats: "greenhouse", endpoint: match!.endpoint, matched: true });
    expect(calls.some((u) => u.includes("api.lever.co"))).toBe(false);
  });

  it("does not treat a 200 response with the wrong shape as a match", async () => {
    globalThis.fetch = (async (input: any) => {
      const url = String(input);
      if (url.includes("boards-api.greenhouse.io")) {
        // 200 OK but not the { jobs: [...] } shape greenhouse actually returns
        return jsonResponse(200, { message: "ok" });
      }
      return jsonResponse(404, {});
    }) as any;

    const { match, attempts } = await detectAtsMigration("some-co", "custom");
    expect(match).toBeNull();
    expect(attempts.every((a) => !a.matched)).toBe(true);
  });

  it("returns no match and lists attempted platforms when nothing responds", async () => {
    globalThis.fetch = (async () => jsonResponse(404, {})) as any;

    const { match, attempts } = await detectAtsMigration("ghost-co", "greenhouse");
    expect(match).toBeNull();
    expect(attempts.map((a) => a.ats).sort()).toEqual(["ashby", "lever"]);
  });

  it("treats a network error on the first candidate as no-match and continues to the next", async () => {
    globalThis.fetch = (async (input: any) => {
      const url = String(input);
      if (url.includes("boards-api.greenhouse.io")) throw new Error("network down");
      if (url.includes("api.lever.co")) return jsonResponse(404, {});
      if (url.includes("ashbyhq.com")) return jsonResponse(200, { jobs: [{ id: 1 }] });
      throw new Error(`unexpected url ${url}`);
    }) as any;

    const { match } = await detectAtsMigration("resilient-co", "custom");
    expect(match?.ats).toBe("ashby");
  });
});

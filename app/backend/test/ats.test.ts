import { describe, it, expect, afterEach } from "bun:test";
import {
  greenhouseSource,
  leverSource,
  ashbySource,
  greenhouseBoardSlug,
  leverCompanySlug,
  ashbyOrgSlug,
} from "../src/jobs/ats/sources";

const company = { ats: "greenhouse", name: "Acme", slug: "acme", atsUrl: "https://boards.greenhouse.io/acme" };

describe("ATS normalization", () => {
  it("normalizes a Greenhouse job", async () => {
    const raw = {
      id: "123",
      title: "Backend Engineer",
      location: { name: "Remote" },
      content: "<p>Build things</p>",
      absolute_url: "https://boards.greenhouse.io/acme/jobs/123",
      updated_at: "2026-01-01T00:00:00Z",
    };
    const norm = await greenhouseSource.normalize(raw, company);
    expect(norm.externalId).toBe("123");
    expect(norm.title).toBe("Backend Engineer");
    expect(norm.location).toBe("Remote");
    expect(norm.applyUrl).toContain("acme/jobs/123");
    expect(norm.description).toContain("Build things");
    expect(norm.site).toBe("greenhouse");
  });

  it("normalizes a Lever job", async () => {
    const raw = {
      id: "abc",
      text: "Senior Dev",
      categories: { location: "Berlin", team: "Platform" },
      descriptionPlain: "Do stuff",
      hostedUrl: "https://jobs.lever.co/acme/abc",
      createdAt: "2026-02-01T00:00:00Z",
    };
    const norm = await leverSource.normalize(raw, { ...company, ats: "lever" });
    expect(norm.externalId).toBe("abc");
    expect(norm.title).toBe("Senior Dev");
    expect(norm.department).toBe("Platform");
    expect(norm.site).toBe("lever");
  });

  it("normalizes an Ashby job", async () => {
    const raw = {
      id: "xyz",
      title: "PM",
      location: { name: "NYC" },
      descriptionPlaintext: "Ship product",
      applicationUrl: "https://jobs.ashbyhq.com/acme/xyz",
      postedAt: "2026-03-01T00:00:00Z",
    };
    const norm = await ashbySource.normalize(raw, { ...company, ats: "ashby" });
    expect(norm.externalId).toBe("xyz");
    expect(norm.title).toBe("PM");
    expect(norm.location).toBe("NYC");
    expect(norm.site).toBe("ashby");
  });
});

describe("ATS slug extraction", () => {
  // greenhouse
  it("extracts slug from boards-api endpoint", () =>
    expect(greenhouseBoardSlug("https://boards-api.greenhouse.io/v1/boards/figma/jobs?content=true")).toBe("figma"));
  it("extracts slug from public board URL", () =>
    expect(greenhouseBoardSlug("https://boards.greenhouse.io/figma")).toBe("figma"));
  it("extracts slug from job-boards host", () =>
    expect(greenhouseBoardSlug("https://job-boards.greenhouse.io/figma/jobs/123")).toBe("figma"));
  // lever
  it("extracts slug from lever API endpoint", () =>
    expect(leverCompanySlug("https://api.lever.co/v0/postings/figma?mode=json")).toBe("figma"));
  it("extracts slug from lever board URL", () =>
    expect(leverCompanySlug("https://jobs.lever.co/figma/abc-123")).toBe("figma"));
  // ashby
  it("extracts org from ashby API endpoint", () =>
    expect(ashbyOrgSlug("https://api.ashbyhq.com/posting-api/job-board/linear?includeCompensation=true")).toBe("linear"));
  it("extracts org from ashby board URL", () =>
    expect(ashbyOrgSlug("https://jobs.ashbyhq.com/linear")).toBe("linear"));
});

describe("ATS pull constructs the correct fetch URL", () => {
  const realFetch = globalThis.fetch;
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  function stubFetch(payload: unknown): () => string[] {
    const urls: string[] = [];
    globalThis.fetch = (async (input: any) => {
      urls.push(String(input));
      return {
        ok: true,
        status: 200,
        json: async () => payload,
        text: async () => JSON.stringify(payload),
      } as Response;
    }) as typeof fetch;
    return () => urls;
  }

  it("greenhouse pulls from the canonical board slug, not the hostname", async () => {
    const getUrls = stubFetch({ jobs: [{ id: 1 }] });
    await greenhouseSource.pullJobs("https://boards-api.greenhouse.io/v1/boards/figma/jobs?content=true");
    expect(getUrls()[0]).toContain("/v1/boards/figma/jobs");
    expect(getUrls()[0]).not.toContain("boards-api/jobs");
  });

  it("lever pulls from the canonical company slug, not the hostname", async () => {
    const getUrls = stubFetch([{ id: "a" }]);
    await leverSource.pullJobs("https://api.lever.co/v0/postings/figma?mode=json");
    expect(getUrls()[0]).toContain("/v0/postings/figma");
    expect(getUrls()[0]).not.toContain("/v0/postings/api");
  });

  it("ashby pulls from the singular posting-api path with the correct org", async () => {
    const getUrls = stubFetch({ jobs: [{ id: "x" }] });
    await ashbySource.pullJobs("https://api.ashbyhq.com/posting-api/job-board/linear?includeCompensation=true");
    expect(getUrls()[0]).toContain("/posting-api/job-board/linear");
    expect(getUrls()[0]).not.toContain("postings-api");
    expect(getUrls()[0]).not.toContain("job-board/posting-api");
  });
});

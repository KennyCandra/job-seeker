import { Router, type Request, type Response } from "express";
import { companies } from "../../db";
import type { AtsPlatform } from "../../shared/types";
import { enqueueTask } from "../../queue/enqueue";
import { endpointForAts, slug as slugify } from "../../shared/index";

const router = Router();
const atsPlatforms = new Set<AtsPlatform>(["greenhouse", "lever", "ashby", "custom"]);

router.get("/companies", async (_req: Request, res: Response) => {
  try {
    const all = await companies.instance.getAll();
    res.json(all);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/companies/discover", async (_req: Request, res: Response) => {
  try {
    const result = await enqueueTask("discover-companies", {}, { dedupeKey: "discover-companies" });
    res.json({ ok: true, ...result });
  } catch (err: any) {
    console.error(`[discovery] API discover failed: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

router.post("/companies", async (req: Request, res: Response) => {
  try {
    const { name, ats, boardUrl, endpoint } = req.body as { name: string; ats: AtsPlatform; boardUrl?: string; endpoint?: string };
    if (!name || !ats) { res.status(400).json({ error: "name and ats required" }); return; }
    if (!atsPlatforms.has(ats)) {
      res.status(400).json({ error: "Invalid ats" });
      return;
    }

    const companySlug = slugify(name);
    const requestedEndpoint = endpoint || boardUrl || endpointForAts(companySlug, ats);
    const validationError = validateCompanyEndpoint(ats, requestedEndpoint);
    if (validationError) {
      res.status(400).json({ error: validationError });
      return;
    }

    const ok = await companies.instance.save({
      name,
      ats,
      endpoint: ats === "custom" ? "manual" : requestedEndpoint,
    });
    res.status(201).json({ ok });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/companies/:slug/active", async (req: Request, res: Response) => {
  try {
    const companySlug = String(req.params.slug);
    const { active } = req.body as { active: boolean };
    if (active) await companies.instance.reactivate(companySlug);
    else await companies.instance.deactivate(companySlug);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/companies/:slug", async (req: Request, res: Response) => {
  try {
    await companies.instance.deactivate(String(req.params.slug));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/companies/:slug/fetch", async (req: Request, res: Response) => {
  try {
    const companySlug = String(req.params.slug);
    const { filter: doFilter } = req.body as { filter?: boolean };

    const company = await companies.instance.getBySlug(companySlug);
    if (!company) {
      res.status(404).json({ error: "Company not found" });
      return;
    }

    const result = await enqueueTask(
      "sync-company",
      { companySlug, filter: Boolean(doFilter) },
      { dedupeKey: `sync-company:${companySlug}:${Boolean(doFilter)}` },
    );
    res.json({ ok: true, company: company.name, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

function validateCompanyEndpoint(ats: AtsPlatform, endpoint: string): string | null {
  if (ats === "custom") {
    return endpoint === "manual" || endpoint.trim() === "" ? null : "custom companies cannot store a fetchable endpoint";
  }

  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return "endpoint must be a valid URL";
  }

  if (!["https:", "http:"].includes(url.protocol)) {
    return "endpoint must use http or https";
  }

  const host = url.hostname.toLowerCase();
  const allowedHosts: Record<Exclude<AtsPlatform, "custom">, string[]> = {
    greenhouse: ["boards.greenhouse.io", "boards-api.greenhouse.io", "job-boards.greenhouse.io"],
    lever: ["api.lever.co", "jobs.lever.co"],
    ashby: ["api.ashbyhq.com", "jobs.ashbyhq.com"],
  };

  if (!allowedHosts[ats].includes(host)) {
    return `${ats} endpoint host is not allowed`;
  }

  return null;
}

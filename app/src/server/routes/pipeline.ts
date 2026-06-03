import { Router, type Request, type Response } from "express";
import { sseSetup, sseSend } from "../middleware/sse";
import { loadSearchConfig } from "../../shared/config";
import { createClient } from "../../shared/client";
import { buildDorkQueries, discoverViaPlaywright, saveNewDiscoveredCompanies } from "../../discovery/index";
import { fetchAllJobs } from "../../jobs/index";
import { filterJobs, saveFilterResults } from "../../filter/index";
import { makeCvForJob } from "../../generator/index";

const router = Router();

router.get("/api/pipeline/run", (req: Request, res: Response) => {
  sseSetup(res);

  (async () => {
    try {
      sseSend(res, "log", { type: "info", message: "Starting pipeline..." });
      const config = loadSearchConfig();

      sseSend(res, "log", { type: "info", message: "Fetching jobs from all companies..." });
      const newJobs = await fetchAllJobs();
      sseSend(res, "log", { type: "done", message: `Fetched ${newJobs.length} jobs` });

      if (newJobs.length === 0) {
        sseSend(res, "log", { type: "warn", message: "No new jobs found" });
        sseSend(res, "done", {});
        res.end();
        return;
      }

      sseSend(res, "log", { type: "info", message: "Filtering jobs with AI..." });
      const client = createClient();
      const results = await filterJobs(client, newJobs, config);
      saveFilterResults(results);
      const accepted = results.filter(
        (r) => r.filter.verdict === "accept" && r.filter.score >= config.min_score,
      );

      sseSend(res, "log", {
        type: "done",
        message: `${accepted.length}/${results.length} jobs passed threshold (min ${config.min_score})`,
      });

      for (const r of results) {
        const { job, filter } = r;
        if (filter.verdict === "accept") {
          sseSend(res, "log", { type: "accept", message: `[${filter.score}] ${job.company} — ${job.title}` });
        } else {
          sseSend(res, "log", { type: "reject", message: `[${filter.score}] ${job.company} — ${job.title}` });
        }
      }

      sseSend(res, "done", { count: accepted.length });
    } catch (err: any) {
      sseSend(res, "log", { type: "error", message: err.message });
      sseSend(res, "done", { error: err.message });
    }
    res.end();
  })();
});

router.get("/api/pipeline/discover", (req: Request, res: Response) => {
  sseSetup(res);

  (async () => {
    try {
      sseSend(res, "log", { type: "info", message: "Starting company discovery..." });
      const config = loadSearchConfig();
      const queries = buildDorkQueries(config);
      const discovered = await discoverViaPlaywright(queries);
      const added = saveNewDiscoveredCompanies(discovered);
      const result = { added, total: discovered.length };
      sseSend(res, "log", { type: "done", message: `Found ${result.total} companies, ${result.added} new` });
      sseSend(res, "done", result);
    } catch (err: any) {
      sseSend(res, "log", { type: "error", message: err.message });
      sseSend(res, "done", { error: err.message });
    }
    res.end();
  })();
});

router.get("/api/pipeline/discover-and-process", (req: Request, res: Response) => {
  sseSetup(res);

  (async () => {
    try {
      sseSend(res, "log", { type: "info", message: "Starting full pipeline: discover → fetch → filter → CV..." });
      const config = loadSearchConfig();
      const client = createClient();
      const errors: string[] = [];

      sseSend(res, "log", { type: "info", message: "Discovering companies..." });
      const queries = buildDorkQueries(config);
      const discovered = await discoverViaPlaywright(queries);
      const added = saveNewDiscoveredCompanies(discovered);
      sseSend(res, "log", { type: "done", message: `Discovered ${discovered.length} companies, ${added} new` });

      sseSend(res, "log", { type: "info", message: "Fetching jobs..." });
      const jobs = await fetchAllJobs();
      sseSend(res, "log", { type: "done", message: `Fetched ${jobs.length} jobs` });

      sseSend(res, "log", { type: "info", message: "Filtering jobs with AI..." });
      const results = await filterJobs(client, jobs, config);
      const accepted = results.filter(
        (r) => r.filter.verdict === "accept" && r.filter.score >= config.min_score,
      );
      sseSend(res, "log", { type: "done", message: `${accepted.length}/${results.length} jobs accepted` });

      let generated = 0;
      for (const r of accepted) {
        try {
          sseSend(res, "log", { type: "info", message: `Generating CV for ${r.job.company} — ${r.job.title}...` });
          await makeCvForJob(r.job, r.filter.score, client);
          generated++;
          sseSend(res, "log", { type: "accept", message: `[${r.filter.score}] ${r.job.company} — ${r.job.title} — CV generated` });
        } catch (err: any) {
          const msg = `CV failed for ${r.job.company} — ${r.job.title}: ${err.message}`;
          errors.push(msg);
          sseSend(res, "log", { type: "error", message: msg });
        }
      }

      sseSend(res, "log", {
        type: "done",
        message: `Done: ${added} companies, ${jobs.length} jobs, ${accepted.length} accepted, ${generated} CVs`,
      });
      sseSend(res, "done", {
        discovered: added, fetched: jobs.length,
        accepted: accepted.length, generated,
        errors: errors.length,
      });
    } catch (err: any) {
      sseSend(res, "log", { type: "error", message: err.message });
      sseSend(res, "done", { error: err.message });
    }
    res.end();
  })();
});

export default router;

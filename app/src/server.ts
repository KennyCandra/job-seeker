import express, { type Request, type Response } from "express";
import { join } from "path";
import { existsSync } from "fs";
import {
  fetchJobs,
  filterJobs,
  createClient,
  slug,
  JOBS_DIR,
} from "./pipeline.ts";
import { getApplications } from "./db.ts";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

function sendJson(res: Response, data: unknown, status = 200) {
  res.status(status).json(data);
}

function sendError(res: Response, message: string, status = 500) {
  res.status(status).json({ error: message });
}

app.get("/health", (_req: Request, res: Response) => {
  sendJson(res, { status: "ok" });
});

app.get("/api/jobs", (_req: Request, res: Response) => {
  const apps = getApplications();
  sendJson(res, { count: apps.length, applications: apps });
});

app.post("/api/jobs/fetch", async (req: Request, res: Response) => {
  try {
    const { search, location, num, hours } = req.body || {};
    const newJobs = await fetchJobs({ search, location, num, hours });
    sendJson(res, { message: "Jobs fetched", new: newJobs.length });
  } catch (err: unknown) {
    const error = err as Error;
    sendError(res, error?.message || "An unknown error occurred");
  }
});

app.post("/api/filter", async (req: Request, res: Response) => {
  try {
    const jobs = req.body?.jobs;
    if (!jobs || jobs.length === 0) {
      return sendError(res, "Provide jobs array in body", 400);
    }

    const client = createClient();
    const results = await filterJobs(client, jobs);

    const summary = results.map((r) => ({
      job: { id: r.job.id, title: r.job.title, company: r.job.company },
      verdict: r.filter.verdict,
      score: r.filter.score,
      reasons: r.filter.reasons,
    }));

    sendJson(res, { count: results.length, results: summary });
  } catch (err: unknown) {
    const error = err as Error;
    sendError(res, error?.message || "An unknown error occurred");
  }
});

app.get("/api/output/:company/:file", (req: Request, res: Response) => {
  const filePath = join(JOBS_DIR, slug(req.params.company as string), req.params.file as string);
  if (!existsSync(filePath)) {
    return sendError(res, "File not found", 404);
  }
  res.sendFile(filePath);
});

export function start() {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
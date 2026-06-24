import express, { type Request, type Response } from "express";
import { join } from "path";
import { existsSync } from "fs";
import { APP_ROOT } from "../shared/paths";

import statsRouter from "./routes/stats";
import shortlistRouter from "./routes/shortlist";
import applicationsRouter from "./routes/applications";
import companiesRouter from "./routes/companies";
import configRouter from "./routes/config";
import savedJobsRouter from "./routes/savedJobs";
import jobsRouter from "./routes/jobs";
import pipelineRouter from "./routes/pipeline";
import cvRouter from "./routes/cv";
import jobRouter from "./routes/job";
import applyRouter from "./routes/apply";
import tasksRouter from "./routes/tasks";
import profileRouter from "./routes/profile";
import { queuesAdminBasePath, queuesAdminRouter } from "./routes/queuesAdmin";

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const FRONTEND_DIST = join(APP_ROOT, "app", "frontend", "dist");

app.use(express.json({ limit: "10mb" }));

app.use(statsRouter);
app.use(shortlistRouter);
app.use(applicationsRouter);
app.use(companiesRouter);
app.use(configRouter);
app.use(savedJobsRouter);
app.use(jobsRouter);
app.use(pipelineRouter);
app.use(cvRouter);
app.use(jobRouter);
app.use(applyRouter);
app.use(tasksRouter);
app.use(profileRouter);
app.use(queuesAdminBasePath, queuesAdminRouter);

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok" });
});

if (existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.get("/{*path}", (_req: Request, res: Response) => {
    res.sendFile(join(FRONTEND_DIST, "index.html"));
  });
}

export function start() {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

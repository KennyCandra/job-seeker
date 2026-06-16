import { getDb } from "./app/src/db/connection";
import { runApply } from "./app/src/apply";
import { ApplicationRunsRepository } from "./app/src/db/repositories/applicationRuns";
import { ApplicationRunStepsRepository } from "./app/src/db/repositories/applicationRunSteps";
import { JobsRepository } from "./app/src/db/repositories/jobs";

const APPLY_URL = process.env.APPLY_URL || "https://job-boards.greenhouse.io/runpod/jobs/4785681008";

const db = getDb();
const runsRepo = new ApplicationRunsRepository(db);
const stepsRepo = new ApplicationRunStepsRepository(db);
const jobsRepo = new JobsRepository(db);

const job = process.env.APPLY_JOB_ID
  ? jobsRepo.getById(process.env.APPLY_JOB_ID)
  : jobsRepo.getAll().find((item) => item.url) as ReturnType<JobsRepository["getById"]>;

if (!job) {
  throw new Error("No job found for dev apply run. Set APPLY_JOB_ID to an existing job id or add jobs to the database first.");
}

const JOB_ID = job.id;
const url = process.env.APPLY_URL || job.url || APPLY_URL;

const runId = `dev-${JOB_ID}-${Date.now()}`;

runsRepo.create({
  id: runId,
  jobId: JOB_ID,
  profilePath: "",
  outputDir: "",
  currentUrl: url,
});

stepsRepo.create({
  id: `step-${runId}-init`,
  runId,
  type: "info",
  label: "dev-run-started",
  detail: `Dev run for ${url}`,
});

const result = await runApply({
  runId,
  jobId: JOB_ID,
  url,
  runsRepo,
  stepsRepo,
  headless: false,
});

console.log("[result]", JSON.stringify(result, null, 2));
process.exit(result.status === "failed" ? 1 : 0);

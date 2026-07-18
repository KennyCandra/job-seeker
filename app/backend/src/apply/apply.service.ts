import { Injectable, Logger } from "@nestjs/common";
import { Queue } from "bullmq";
import { InjectQueue } from "@nestjs/bullmq";
import { existsSync } from "fs";
import { JobsRepository, ApplicationRunsRepository, ApplicationRunStepsRepository } from "../database/repositories";
import { APPLY_QUEUE } from "../queue/constants";
import { AppException } from "../common/errors";
import { resolveContainedPath } from "../common/paths";
import { ApplyControlService } from "./apply-control.service";

@Injectable()
export class ApplyService {
  private readonly logger = new Logger(ApplyService.name);

  constructor(
    @InjectQueue(APPLY_QUEUE) private readonly queue: Queue,
    private readonly jobs: JobsRepository,
    private readonly runs: ApplicationRunsRepository,
    private readonly steps: ApplicationRunStepsRepository,
    private readonly control: ApplyControlService,
  ) {}

  async startRun(jobId: string, profilePath?: string) {
    const job = await this.jobs.getById(jobId);
    if (!job) throw new AppException(404, "Job not found");
    if (!job.url) throw new AppException(400, "Job has no URL to apply at");

    const runId = `apply-${jobId}-${Date.now()}`;
    const resolvedProfile = profilePath || "";

    await this.runs.create({ id: runId, jobId, profilePath: resolvedProfile, currentUrl: job.url });
    await this.steps.create({
      id: `step-${runId}-init`,
      runId,
      type: "info",
      label: "run-started",
      detail: `Starting apply run for ${job.title} at ${job.companyName}`,
    });

    const task = await this.queue.add(
      "run-apply",
      { applyRunId: runId, jobId, url: job.url, profilePath: resolvedProfile },
      { jobId: `run-apply:${runId}`, removeOnComplete: { age: 3600 * 24 }, removeOnFail: { age: 3600 * 24 } },
    );

    return { ok: true, runId, taskRunId: task.id, message: "Apply run queued" };
  }

  async getLatest(jobId: string) {
    const run = await this.runs.getLatestByJobId(jobId);
    if (!run) return { run: null, steps: [] };
    const steps = await this.steps.getByRunId(run.id);
    return { run, steps };
  }

  async getRun(runId: string) {
    const run = await this.runs.getById(runId);
    if (!run) return null;
    const steps = await this.steps.getByRunId(runId);
    return { run, steps };
  }

  async resume(runId: string) {
    const run = await this.runs.getById(runId);
    if (!run) throw new AppException(404, "Run not found");
    if (run.status !== "needs_user") {
      throw new AppException(400, `Run is not paused for human review (status: ${run.status})`);
    }
    await this.control.publish({ runId, action: "resume" });
    return { ok: true, dispatched: true };
  }

  async cancel(runId: string) {
    // The run may still be queued (not yet picked up by the worker) or
    // already paused with a live browser session — cover both.
    try {
      const job = await this.queue.getJob(`run-apply:${runId}`);
      if (job) await job.remove();
    } catch {
      // ignore — job may already be gone
    }
    await this.control.publish({ runId, action: "cancel" });
    return { ok: true };
  }

  async getScreenshot(runId: string, fileName: string): Promise<{ filePath: string; contentType: string }> {
    const run = await this.runs.getById(runId);
    if (!run) throw new AppException(404, "Run not found");
    if (!run.outputDir) throw new AppException(404, "No output directory for this run");

    const filePath = resolveContainedPath(run.outputDir, fileName);
    if (!filePath) throw new AppException(403, "Invalid path");
    if (!existsSync(filePath)) throw new AppException(404, "File not found");

    const ext = fileName.toLowerCase().split(".").pop();
    const contentType = ext === "png" ? "image/png" : ext === "jpg" || ext === "jpeg" ? "image/jpeg" : "application/octet-stream";
    return { filePath, contentType };
  }
}

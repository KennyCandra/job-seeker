import { Logger, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Processor, WorkerHost } from "@nestjs/bullmq";
import type { Job } from "bullmq";
import { JobsRepository, ApplicationRunsRepository, ApplicationRunStepsRepository, UserProfileRepository, UserAnswersRepository } from "../database/repositories";
import { APPLY_QUEUE } from "../queue/constants";
import { OpenCodeClient } from "../shared/llm";
import { runApply } from "./runner";
import { buildApplicantProfile } from "./profile";
import { getPausedApplySession } from "./sessions";
import { ApplyControlService } from "./apply-control.service";
import type { EnvConfig } from "../config/env";

interface ApplyJobData {
  applyRunId?: string;
  jobId: string;
  url: string;
}

@Injectable()
@Processor(APPLY_QUEUE)
export class ApplyProcessor extends WorkerHost {
  private readonly logger = new Logger(ApplyProcessor.name);

  constructor(
    private readonly jobs: JobsRepository,
    private readonly runs: ApplicationRunsRepository,
    private readonly steps: ApplicationRunStepsRepository,
    private readonly profile: UserProfileRepository,
    private readonly userAnswers: UserAnswersRepository,
    private readonly control: ApplyControlService,
    private readonly config: ConfigService<EnvConfig>,
  ) {
    super();
  }

  async process(job: Job<ApplyJobData>): Promise<any> {
    const { applyRunId, jobId, url } = job.data;
    const runId = applyRunId || `apply-${jobId}`;
    this.logger.log(`Running apply run ${runId} for job ${jobId} -> ${url}`);

    const jobRow = await this.jobs.getById(jobId);
    if (!jobRow) throw new Error(`Job not found: ${jobId}`);

    const profileRow = await this.profile.get();
    const answerRows = await this.userAnswers.getAll();
    const { profile, answersMarkdown } = buildApplicantProfile(profileRow, answerRows);

    // Bridge resume/cancel requests published by the API process (which has
    // no access to this process's in-memory Playwright session) to the
    // paused session's own resume()/cancel() callbacks.
    this.control.onControl(runId, (action) => {
      const session = getPausedApplySession(runId);
      if (!session) return;
      // One-shot: a paused run is only ever resumed or cancelled once, so
      // stop listening as soon as we dispatch to avoid a stale map entry.
      this.control.offControl(runId);
      if (action === "resume") {
        session.resume().catch((err) => this.logger.error(`Resume failed for ${runId}: ${err?.message ?? err}`));
      } else if (action === "cancel") {
        session.cancel().catch((err) => this.logger.error(`Cancel failed for ${runId}: ${err?.message ?? err}`));
      }
    });

    try {
      const result = await runApply({
        runId,
        jobId,
        url,
        profile,
        answersMarkdown,
        keepBrowserOnBlock: this.config.get("APPLY_KEEP_BROWSER_ON_BLOCK", { infer: true }),
        llm: OpenCodeClient.fromConfig(this.config),
        runsRepo: this.runs,
        stepsRepo: this.steps,
      });
      return result;
    } finally {
      // Only stop listening once the run isn't left paused waiting for a
      // human — a paused session still needs control messages to arrive.
      if (!getPausedApplySession(runId)) {
        this.control.offControl(runId);
      }
    }
  }
}

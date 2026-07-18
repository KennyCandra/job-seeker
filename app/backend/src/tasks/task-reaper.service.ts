import { Injectable, Logger, OnApplicationBootstrap } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { TaskRunsRepository } from "../database/repositories";
import { TASK_QUEUE } from "../queue/constants";

/**
 * On worker startup, reconcile task_runs left in "running" by a previous worker
 * that stopped mid-flight (crash/OOM/kill). Such rows would otherwise sit
 * forever, show phantom in-progress work, and — now that dedupe works — hold
 * their dedupe key hostage so the same task can never be re-enqueued.
 *
 * Worker-only: provided by TasksWorkerModule, never the API process.
 */
@Injectable()
export class TaskReaperService implements OnApplicationBootstrap {
  private readonly logger = new Logger(TaskReaperService.name);

  constructor(
    @InjectQueue(TASK_QUEUE) private readonly queue: Queue,
    private readonly taskRuns: TaskRunsRepository,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const running = await this.taskRuns.getByStatus("running");
    let reaped = 0;
    for (const run of running) {
      const job = run.bullJobId ? await this.queue.getJob(run.bullJobId) : null;
      const state = job ? await job.getState() : "missing";
      // Only reap when the Bull job is genuinely gone or not active — never by
      // age alone, so a second worker process can't reap another worker's live
      // run.
      if (state !== "active" && state !== "waiting" && state !== "delayed") {
        await this.taskRuns.updateError(
          run.id,
          "stale run reaped at worker startup — worker previously stopped mid-run",
        );
        reaped++;
      }
    }
    if (reaped > 0) this.logger.warn(`Reaped ${reaped} stale running task run(s)`);
  }
}

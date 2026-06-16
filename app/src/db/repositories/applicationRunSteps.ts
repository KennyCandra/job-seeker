import { eq, asc } from "drizzle-orm";
import { Repository } from "../repository";
import { applicationRunSteps } from "../schema";

export type ApplicationRunStepType = "fill" | "ai_answer" | "upload" | "needs_user" | "screenshot" | "safety_stop" | "info" | "error" | "page_prepare" | "form_detected" | "form_not_ready" | "cookie_handled" | "iframe_detected" | "verify_failed";

export type ApplicationRunStepRow = {
  id: string;
  runId: string;
  type: ApplicationRunStepType;
  label: string;
  detail: string;
  screenshotPath: string | null;
  payload: string;
  createdAt: string;
};

export type CreateApplicationRunStepInput = {
  id: string;
  runId: string;
  type: ApplicationRunStepType;
  label?: string;
  detail?: string;
  screenshotPath?: string | null;
  payload?: string;
};

export class ApplicationRunStepsRepository extends Repository {
  async create(input: CreateApplicationRunStepInput): Promise<void> {
    await this.db.insert(applicationRunSteps)
      .values({
        id: input.id,
        runId: input.runId,
        type: input.type,
        label: input.label ?? "",
        detail: input.detail ?? "",
        screenshotPath: input.screenshotPath ?? null,
        payload: input.payload ?? "{}",
        createdAt: this.now(),
      });
  }

  async getByRunId(runId: string): Promise<ApplicationRunStepRow[]> {
    return this.db.select().from(applicationRunSteps)
      .where(eq(applicationRunSteps.runId, runId))
      .orderBy(asc(applicationRunSteps.createdAt)) as Promise<ApplicationRunStepRow[]>;
  }
}

import { Injectable } from "@nestjs/common";
import { DataSource } from "typeorm";

export type SaveApplicationRunStepInput = {
  id: string;
  runId: string;
  type: string;
  label?: string;
  detail?: string;
  screenshotPath?: string | null;
  payload?: unknown;
  createdAt?: string;
};

export type ApplicationRunStepRecord = {
  id: string;
  runId: string;
  type: string;
  label: string;
  detail: string;
  screenshotPath: string | null;
  payload: unknown;
  createdAt: string;
};

@Injectable()
export class ApplicationRunStepsRepository {
  constructor(private readonly dataSource: DataSource) {}

  async create(input: SaveApplicationRunStepInput): Promise<void> {
    const now = input.createdAt || new Date().toISOString();
    await this.dataSource.query(
      `INSERT INTO application_run_steps (id, run_id, type, label, detail, screenshot_path, payload, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        input.id,
        input.runId,
        input.type,
        input.label ?? "",
        input.detail ?? "",
        input.screenshotPath ?? null,
        JSON.stringify(input.payload ?? {}),
        now,
      ],
    );
  }

  async getByRunId(runId: string): Promise<ApplicationRunStepRecord[]> {
    const rows = await this.dataSource.query(
      `SELECT id, run_id AS "runId", type, label, detail, screenshot_path AS "screenshotPath",
              payload, created_at AS "createdAt"
       FROM application_run_steps WHERE run_id = $1 ORDER BY created_at ASC, id ASC`,
      [runId],
    );
    return rows as ApplicationRunStepRecord[];
  }
}

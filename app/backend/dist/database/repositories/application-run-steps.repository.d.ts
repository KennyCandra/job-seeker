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
export declare class ApplicationRunStepsRepository {
    private readonly dataSource;
    constructor(dataSource: DataSource);
    create(input: SaveApplicationRunStepInput): Promise<void>;
    getByRunId(runId: string): Promise<ApplicationRunStepRecord[]>;
}

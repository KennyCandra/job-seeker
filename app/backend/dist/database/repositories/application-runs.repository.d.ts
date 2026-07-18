import { DataSource } from "typeorm";
export type SaveApplicationRunInput = {
    id: string;
    jobId: string;
    status?: string;
    profilePath?: string;
    outputDir?: string;
    currentUrl?: string;
    error?: string | null;
    summary?: unknown;
    createdAt?: string;
    updatedAt?: string;
};
export type ApplicationRunPatch = {
    currentUrl?: string;
    outputDir?: string;
    error?: string | null;
    summary?: unknown;
};
export type ApplicationRunRow = {
    id: string;
    jobId: string;
    status: string;
    profilePath: string;
    outputDir: string;
    currentUrl: string;
    error: string | null;
    summary: string;
    createdAt: string;
    updatedAt: string;
};
export declare class ApplicationRunsRepository {
    private readonly dataSource;
    constructor(dataSource: DataSource);
    create(input: SaveApplicationRunInput): Promise<void>;
    getById(runId: string): Promise<ApplicationRunRow | null>;
    getLatestByJobId(jobId: string): Promise<ApplicationRunRow | null>;
    updateStatus(runId: string, status: string, patch?: ApplicationRunPatch): Promise<void>;
}

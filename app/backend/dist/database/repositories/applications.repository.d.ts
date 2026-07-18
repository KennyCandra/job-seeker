import { DataSource } from "typeorm";
export type SaveApplicationInput = {
    id: string;
    jobId: string;
    status?: string;
    score?: number;
    documents?: string;
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
};
export type ApplicationRow = {
    id: string;
    jobId: string;
    status: string;
    score: number;
    documents: string;
    notes: string;
    createdAt: string;
    updatedAt: string;
};
export declare class ApplicationsRepository {
    private readonly dataSource;
    constructor(dataSource: DataSource);
    create(input: SaveApplicationInput): Promise<void>;
    getByJobId(jobId: string): Promise<ApplicationRow | undefined>;
    getAll(): Promise<ApplicationRow[]>;
    updateStatus(jobId: string, status: string): Promise<void>;
    saveAcceptedJob(jobId: string, score: number, status: string): Promise<void>;
    getProcessedJobIdsFor(jobIds: string[]): Promise<string[]>;
    delete(jobId: string): Promise<void>;
    listCursor(cursorId?: string, limit?: number): Promise<{
        items: ApplicationRow[];
        nextCursor: string | null;
    }>;
}

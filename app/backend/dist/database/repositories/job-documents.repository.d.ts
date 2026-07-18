import { DataSource } from "typeorm";
export type SaveJobDocumentInput = {
    id: string;
    jobId: string;
    type: string;
    status?: string;
    content?: string;
    filePath?: string;
    metadata?: unknown;
    createdBy?: string;
    createdAt?: string;
    updatedAt?: string;
};
export type JobDocumentRow = {
    id: string;
    jobId: string;
    type: string;
    status: string;
    content: string;
    filePath: string;
    metadata: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;
};
export declare class JobDocumentsRepository {
    private readonly dataSource;
    constructor(dataSource: DataSource);
    save(input: SaveJobDocumentInput): Promise<void>;
    getById(id: string): Promise<JobDocumentRow | undefined>;
    getByJobId(jobId: string): Promise<JobDocumentRow[]>;
}

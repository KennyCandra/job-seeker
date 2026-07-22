import { DataSource } from "typeorm";
export type CompanySnapshotRecord = {
    id: string;
    companyId: number;
    snapshotDate: string;
    openCount: number;
    newCount: number;
    closedCount: number;
    createdAt: string;
};
export declare class CompanySnapshotsRepository {
    private readonly dataSource;
    constructor(dataSource: DataSource);
    upsertForDate(date: string): Promise<number>;
    getByCompany(companyId: number, limit?: number): Promise<CompanySnapshotRecord[]>;
    countForDate(date: string): Promise<number>;
}

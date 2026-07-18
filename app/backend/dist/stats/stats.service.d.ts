import { DataSource } from "typeorm";
export declare class StatsService {
    private readonly dataSource;
    constructor(dataSource: DataSource);
    getStats(): Promise<{
        companies: number;
        jobs: number;
        openJobs: number;
        closedJobs: number;
        shortlist: number;
        applications: number;
        savedJobs: number;
        docsGenerated: number;
        cvCount: number;
        coverLetterCount: number;
        recommendationCount: number;
    }>;
}

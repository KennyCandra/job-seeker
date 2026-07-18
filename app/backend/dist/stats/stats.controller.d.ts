import { StatsService } from "./stats.service";
export declare class StatsController {
    private readonly stats;
    constructor(stats: StatsService);
    get(): Promise<{
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

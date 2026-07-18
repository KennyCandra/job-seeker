import { DataSource } from "typeorm";
export type ShortlistItem = {
    jobId: string;
    company: string;
    companySlug: string;
    title: string;
    location: string;
    score: number;
    verdict: "accept" | "reject";
    reasons: string[];
    mustHaveHits: string[];
    missingItems: string[];
    applyUrl: string;
    filteredAt: string;
};
export declare class ShortlistRepository {
    private readonly dataSource;
    constructor(dataSource: DataSource);
    getAll(): Promise<ShortlistItem[]>;
    delete(jobId: string): Promise<void>;
}

import type { Job } from "./job.entity";
export declare class Company {
    id: number;
    jobs: Job[];
    name: string;
    slug: string;
    ats: string;
    endpoint: string;
    active: number;
    discoveredAt: string;
    lastFetchedAt: string | null;
    lastSuccessfulFetchAt: string | null;
    lastErrorAt: string | null;
    lastError: string | null;
    createdAt: string;
    updatedAt: string;
}

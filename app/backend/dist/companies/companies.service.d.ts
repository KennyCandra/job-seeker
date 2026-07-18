import { CompaniesRepository } from "../database/repositories";
import { TaskQueueService } from "../tasks/task-queue.service";
import type { AtsPlatform } from "../shared/types";
export declare class CompaniesService {
    private readonly companies;
    private readonly queue;
    private readonly logger;
    constructor(companies: CompaniesRepository, queue: TaskQueueService);
    getAll(): Promise<import("../shared/types").CompanyRecord[]>;
    create(input: {
        name: string;
        ats: AtsPlatform;
        boardUrl?: string;
        endpoint?: string;
    }): Promise<{
        ok: boolean;
    }>;
    setActive(slug: string, active: boolean): Promise<{
        ok: boolean;
    }>;
    remove(slug: string): Promise<{
        ok: boolean;
    }>;
    discover(): Promise<{
        runId: string;
        bullJobId: string | undefined;
        status: string;
    }>;
    discoverLegacy(): Promise<{
        runId: string;
        bullJobId: string | undefined;
        status: string;
    }>;
    fetch(slug: string, filter?: boolean): Promise<{
        runId: string;
        bullJobId: string | undefined;
        status: string;
    }>;
}

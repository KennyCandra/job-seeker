import type { Response } from "express";
import { ApplicationsService } from "./applications.service";
export declare class ApplicationsController {
    private readonly apps;
    constructor(apps: ApplicationsService);
    list(cursor?: string): Promise<{
        items: import("../database/repositories/applications.repository").ApplicationRow[];
        nextCursor: string | null;
    }>;
    updateStatus(jobId: string, body: {
        status: string;
    }): Promise<{
        ok: boolean;
    }>;
    remove(jobId: string): Promise<{
        ok: boolean;
    }>;
    downloadPdf(jobId: string, res: Response): Promise<void>;
    generate(jobId: string, force?: string, res?: Response): Promise<void>;
}

import { CompaniesService } from "./companies.service";
import type { AtsPlatform } from "../shared/types";
export declare class CompaniesController {
    private readonly companies;
    constructor(companies: CompaniesService);
    getAll(): Promise<import("../shared/types").CompanyRecord[]>;
    discover(): Promise<{
        runId: string;
        bullJobId: string | undefined;
        status: string;
        ok: boolean;
    }>;
    discoverLegacy(): Promise<{
        runId: string;
        bullJobId: string | undefined;
        status: string;
        ok: boolean;
    }>;
    create(body: {
        name: string;
        ats: AtsPlatform;
        boardUrl?: string;
        endpoint?: string;
    }): Promise<{
        ok: boolean;
    }>;
    setActive(slug: string, body: {
        active: boolean;
    }): Promise<{
        ok: boolean;
    }>;
    remove(slug: string): Promise<{
        ok: boolean;
    }>;
    fetch(slug: string, body: {
        filter?: boolean;
    }): Promise<{
        runId: string;
        bullJobId: string | undefined;
        status: string;
        ok: boolean;
        company: string;
    }>;
}

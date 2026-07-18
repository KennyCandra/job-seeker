import { ShortlistRepository } from "../database/repositories";
export declare class ShortlistController {
    private readonly shortlist;
    constructor(shortlist: ShortlistRepository);
    getAll(): Promise<import("../database/repositories/shortlist.repository").ShortlistItem[]>;
    delete(jobId: string): Promise<{
        ok: boolean;
    }>;
}

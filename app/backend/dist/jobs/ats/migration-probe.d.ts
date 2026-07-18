import type { AtsPlatform } from "../../shared/types";
import type { RawJob } from "./types";
export type MigrationMatch = {
    ats: Exclude<AtsPlatform, "custom">;
    endpoint: string;
    rawJobs: RawJob[];
};
export type MigrationProbeAttempt = {
    ats: string;
    endpoint: string;
    matched: boolean;
};
export declare function detectAtsMigration(companySlug: string, prevAts: AtsPlatform): Promise<{
    match: MigrationMatch | null;
    attempts: MigrationProbeAttempt[];
}>;

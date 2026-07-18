import type { JobSource } from "./types";
export declare function greenhouseBoardSlug(url: string): string;
export declare function leverCompanySlug(url: string): string;
export declare function ashbyOrgSlug(url: string): string;
export declare const greenhouseSource: JobSource;
export declare const leverSource: JobSource;
export declare const ashbySource: JobSource;
export declare const jobSources: JobSource[];
export declare function getSource(atsUrl: string): JobSource;

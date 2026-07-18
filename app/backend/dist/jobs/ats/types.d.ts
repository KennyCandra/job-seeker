export interface RawJob {
    id: string;
    raw: any;
}
export interface NormalizedJob {
    externalId: string;
    site: string;
    title: string;
    company: string;
    location: string;
    department: string;
    url: string;
    applyUrl: string;
    description: string;
    posted_at: string;
    rawData?: string;
}
export interface JobSource {
    name: string;
    matches(url: string): boolean;
    pullJobs(url: string): Promise<RawJob[]>;
    pullJob(url: string, id: string): Promise<any>;
    normalize(rawJob: any, company: any): Promise<NormalizedJob>;
}

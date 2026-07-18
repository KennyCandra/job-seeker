import { Company } from "./company.entity";
import { JobDocument } from "./job-document.entity";
import { Application } from "./application.entity";
import { ApplicationRun } from "./application-run.entity";
import { JobFilterEntity } from "./job-filter.entity";
export declare class Job {
    id: string;
    companyId: number;
    company: Company;
    documents: JobDocument[];
    applications: Application[];
    applicationRuns: ApplicationRun[];
    filters: JobFilterEntity[];
    externalId: string;
    title: string;
    location: string;
    url: string;
    description: string;
    rawJson: string;
    contentHash: string;
    status: string;
    firstSeenAt: string;
    lastSeenAt: string;
    closedAt: string | null;
    createdAt: string;
    updatedAt: string;
}

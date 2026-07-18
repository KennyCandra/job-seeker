import type { DataSource } from "typeorm";
import type { JobSearchInput, JobSearchResult } from "../repositories/jobs.repository";
export type JobsListSql = DataSource;
export declare function searchJobsList(pg: JobsListSql, input: JobSearchInput): Promise<JobSearchResult>;

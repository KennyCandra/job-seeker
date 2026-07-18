import { DataSource, type EntityManager } from "typeorm";
import type { AtsPlatform, CompanyRecord } from "../../shared/types";
export type CreateCompanyInput = {
    slug?: string;
    name: string;
    ats: AtsPlatform;
    endpoint?: string;
    boardUrl?: string;
};
export declare class CompaniesRepository {
    private readonly dataSource;
    constructor(dataSource: DataSource);
    getActive(): Promise<CompanyRecord[]>;
    getBySlug(s: string): Promise<CompanyRecord | undefined>;
    getById(id: number): Promise<CompanyRecord | undefined>;
    getAll(): Promise<CompanyRecord[]>;
    save(input: CreateCompanyInput, manager?: EntityManager): Promise<boolean>;
    updateFetchedAt(s: string, manager?: EntityManager): Promise<void>;
    updateFetchError(s: string, error: string): Promise<void>;
    deactivate(s: string): Promise<void>;
    reactivate(s: string): Promise<void>;
    updateAts(s: string, ats: AtsPlatform, endpoint: string): Promise<void>;
    countPerAts(): Promise<Array<{
        ats: string;
        count: number;
    }>>;
    seed(companiesList: Array<{
        slug: string;
        name: string;
        ats: AtsPlatform;
    }>): Promise<number>;
}

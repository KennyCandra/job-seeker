import { DataSource } from "typeorm";
export declare class SearchConfigRepository {
    private readonly dataSource;
    constructor(dataSource: DataSource);
    getJson<T>(key: string, fallback: T): Promise<T>;
    setJson(key: string, value: unknown): Promise<void>;
    getDefault(key?: string): Promise<{
        key: string;
        value: string;
    } | undefined>;
    save(key: string, value: string): Promise<void>;
}

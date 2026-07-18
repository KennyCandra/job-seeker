export declare function readText(path: string): string;
export declare function writeText(path: string, content: string): void;
export declare function writeJson(path: string, data: unknown): void;
export declare function readJson<T>(path: string, fallback: T): T;

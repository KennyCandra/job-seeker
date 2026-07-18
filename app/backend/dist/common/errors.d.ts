export declare class AppException extends Error {
    readonly status: number;
    readonly details?: unknown | undefined;
    constructor(status: number, message: string, details?: unknown | undefined);
}

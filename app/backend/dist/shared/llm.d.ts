import type { FilterResult, TailoredResumeContent, ApplicationPayload } from "./types";
import { ConfigService } from "@nestjs/config";
import type { EnvConfig } from "../config/env";
export declare class OpenCodeClient {
    private static readonly logger;
    private baseUrl;
    private model;
    private providerId;
    private timeoutMs;
    private debugDir?;
    constructor(options?: {
        baseUrl?: string;
        model?: string;
        providerId?: string;
        timeoutMs?: number;
        debugDir?: string;
    });
    static fromConfig(config: ConfigService<EnvConfig>): OpenCodeClient;
    completeJson(system: string, user: string): Promise<string>;
    private logTrace;
    filterJob(system: string, user: string): Promise<FilterResult>;
    createResume(system: string, user: string): Promise<TailoredResumeContent>;
    createApplication(system: string, user: string): Promise<ApplicationPayload>;
    structured<T = any>(system: string, user: string): Promise<T>;
    private createSession;
    private logRawResponse;
}
export declare function parseJsonFromText<T>(content: string): T;

import type { Browser, Page } from "playwright";
import type { ApplyRunResult } from "./runner";
export type PausedApplySession = {
    runId: string;
    browser: Browser;
    page: Page;
    createdAt: string;
    reason: string;
    resume: () => Promise<ApplyRunResult>;
    cancel: () => Promise<void>;
};
export declare function registerPausedApplySession(session: PausedApplySession): void;
export declare function getPausedApplySession(runId: string): PausedApplySession | undefined;
export declare function clearPausedApplySession(runId: string): void;
export declare function resumePausedApplySession(runId: string): Promise<ApplyRunResult>;
export declare function cancelPausedApplySession(runId: string): Promise<void>;

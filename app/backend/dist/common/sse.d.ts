import type { Response } from "express";
export type SseSender = (event: string, data: unknown) => void;
export declare function setupSse(res: Response): SseSender;

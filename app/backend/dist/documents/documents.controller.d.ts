import type { Response } from "express";
import { GeneratorService } from "./generator.service";
export declare class DocumentsController {
    private readonly generator;
    constructor(generator: GeneratorService);
    list(jobId: string): Promise<import("./generator.service").GeneratedDocument[]>;
    generate(jobId: string, body: {
        type: string;
        force?: boolean;
    }): Promise<{
        exists: boolean;
        document?: import("./generator.service").GeneratedDocument;
        message: string;
        ok: boolean;
        jobId: string;
        type: string;
    }>;
    download(jobId: string, documentId: string, res: Response): Promise<void>;
}

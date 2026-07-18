import type { Response } from "express";
import { GeneratorService } from "../documents/generator.service";
import { TaskQueueService } from "../tasks/task-queue.service";
import { TasksSseService } from "../tasks/sse.service";
export declare class JobExtractController {
    extract(body: {
        text: string;
    }): Promise<import("../shared/types").JobRecord>;
}
export declare class CvController {
    private readonly generator;
    constructor(generator: GeneratorService);
    generate(body: {
        jobId: string;
        profileText?: string;
    }, force?: string, res?: Response): Promise<{
        error: string;
    } | undefined>;
}
export declare class PipelineController {
    private readonly queue;
    private readonly sse;
    constructor(queue: TaskQueueService, sse: TasksSseService);
    run(res: Response): Promise<void>;
    discover(res: Response): Promise<void>;
    discoverAndProcess(res: Response): Promise<void>;
}

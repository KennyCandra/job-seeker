import { OnApplicationBootstrap } from "@nestjs/common";
import { Queue } from "bullmq";
import { TaskRunsRepository } from "../database/repositories";
export declare class TaskReaperService implements OnApplicationBootstrap {
    private readonly queue;
    private readonly taskRuns;
    private readonly logger;
    private readonly bootTime;
    constructor(queue: Queue, taskRuns: TaskRunsRepository);
    onApplicationBootstrap(): Promise<void>;
}

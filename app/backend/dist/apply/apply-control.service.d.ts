import { OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { EnvConfig } from "../config/env";
export type ApplyControlAction = "resume" | "cancel";
export type ApplyControlMessage = {
    runId: string;
    action: ApplyControlAction;
};
export declare class ApplyControlService implements OnModuleDestroy {
    private readonly config;
    private readonly logger;
    private readonly publisher;
    private subscriber;
    private readonly handlers;
    constructor(config: ConfigService<EnvConfig>);
    publish(message: ApplyControlMessage): Promise<void>;
    onControl(runId: string, handler: (action: ApplyControlAction) => void): void;
    offControl(runId: string): void;
    private ensureSubscribed;
    onModuleDestroy(): Promise<void>;
}

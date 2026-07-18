import { CanActivate, ExecutionContext } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { EnvConfig } from "../config/env";
export declare class LocalOrAdminGuard implements CanActivate {
    private readonly config;
    constructor(config: ConfigService<EnvConfig>);
    canActivate(context: ExecutionContext): boolean;
}

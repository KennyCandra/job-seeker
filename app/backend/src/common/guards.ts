import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from "@nestjs/common";
import { Request } from "express";
import { ConfigService } from "@nestjs/config";
import type { EnvConfig } from "../config/env";

@Injectable()
export class LocalOrAdminGuard implements CanActivate {
  constructor(private readonly config: ConfigService<EnvConfig>) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const token = this.config.get("ADMIN_API_TOKEN", { infer: true });

    // Trust only the socket peer address — never X-Forwarded-For, which any
    // remote client can spoof (`X-Forwarded-For: 127.0.0.1`) to pass this gate.
    const isLocal =
      req.ip === "127.0.0.1" ||
      req.ip === "::1" ||
      req.ip === "::ffff:127.0.0.1";

    if (isLocal) return true;

    const authHeader = req.headers["authorization"] || "";
    const provided = authHeader.replace(/^Bearer\s+/i, "");
    if (token && provided === token) return true;

    throw new ForbiddenException({
      error: "Local or admin access required",
    });
  }
}

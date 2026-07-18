import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import type { Response } from "express";
import { ZodError } from "zod";
import { AppException } from "./errors";

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof ZodError) {
      res.status(HttpStatus.BAD_REQUEST).json({ error: exception.issues });
      return;
    }

    if (exception instanceof AppException) {
      res.status(exception.status).json({ error: exception.message });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === "string") {
        res.status(status).json({ error: body });
        return;
      }
      const message =
        (body as Record<string, unknown>)?.message || exception.message;
      res.status(status).json({ error: Array.isArray(message) ? message[0] : message });
      return;
    }

    // Unhandled — a real crash, not an expected 4xx. Log it (with stack) so it
    // isn't swallowed silently behind a bare 500.
    this.logger.error(
      exception instanceof Error ? (exception.stack ?? exception.message) : String(exception),
    );
    const message =
      exception instanceof Error ? exception.message : "Internal server error";
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ error: message });
  }
}

import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import type { EnvConfig } from "../config/env";

export type ApplyControlAction = "resume" | "cancel";
export type ApplyControlMessage = { runId: string; action: ApplyControlAction };

const APPLY_CONTROL_CHANNEL = "apply-control";

/**
 * Bridges apply run resume/cancel across the API <-> worker process boundary.
 * A paused Playwright session only ever lives in the worker process's memory
 * (see sessions.ts); the API process can't reach it directly. The API side
 * publishes a control message here; the worker subscribes once and dispatches
 * it to whichever paused run is listening for that runId.
 */
@Injectable()
export class ApplyControlService implements OnModuleDestroy {
  private readonly logger = new Logger(ApplyControlService.name);
  private readonly publisher: Redis;
  private subscriber: Redis | null = null;
  private readonly handlers = new Map<string, (action: ApplyControlAction) => void>();

  constructor(private readonly config: ConfigService<EnvConfig>) {
    // lazyConnect: the API process only needs this connection when a
    // resume/cancel is actually issued; ioredis connects on first command.
    this.publisher = new Redis(this.config.get("REDIS_URL", { infer: true })!, {
      maxRetriesPerRequest: null,
      lazyConnect: true,
    });
  }

  async publish(message: ApplyControlMessage): Promise<void> {
    await this.publisher.publish(APPLY_CONTROL_CHANNEL, JSON.stringify(message));
  }

  /** Worker-side: get notified when a control message arrives for this runId. */
  onControl(runId: string, handler: (action: ApplyControlAction) => void): void {
    this.ensureSubscribed();
    this.handlers.set(runId, handler);
  }

  offControl(runId: string): void {
    this.handlers.delete(runId);
  }

  private ensureSubscribed(): void {
    if (this.subscriber) return;
    this.subscriber = this.publisher.duplicate();
    this.subscriber.subscribe(APPLY_CONTROL_CHANNEL).catch((err: Error) => {
      this.logger.error(`Failed to subscribe to ${APPLY_CONTROL_CHANNEL}: ${err.message}`);
    });
    this.subscriber.on("message", (_channel: string, raw: string) => {
      let message: ApplyControlMessage;
      try {
        message = JSON.parse(raw) as ApplyControlMessage;
      } catch (err: any) {
        this.logger.error(`Bad apply-control message: ${err?.message ?? err}`);
        return;
      }
      const handler = this.handlers.get(message.runId);
      if (handler) handler(message.action);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.publisher.quit().catch(() => {});
    await this.subscriber?.quit().catch(() => {});
  }
}

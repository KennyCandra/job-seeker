import type { DrizzleDb } from "./connection";

export class Repository {
  constructor(protected readonly db: DrizzleDb) {}

  protected now(): string {
    return new Date().toISOString();
  }
}

import type { Browser, Page } from "playwright";
import type { ApplyRunResult } from "./runner";

export type PausedApplySession = {
  runId: string;
  browser: Browser;
  page: Page;
  createdAt: string;
  reason: string;
  resume: () => Promise<ApplyRunResult>;
  cancel: () => Promise<void>;
};

const sessions = new Map<string, PausedApplySession>();

export function registerPausedApplySession(session: PausedApplySession): void {
  sessions.set(session.runId, session);
}

export function getPausedApplySession(runId: string): PausedApplySession | undefined {
  return sessions.get(runId);
}

export function clearPausedApplySession(runId: string): void {
  sessions.delete(runId);
}

export async function resumePausedApplySession(runId: string): Promise<ApplyRunResult> {
  const session = sessions.get(runId);
  if (!session) {
    throw new Error("No live paused browser session for this run");
  }
  return session.resume();
}

export async function cancelPausedApplySession(runId: string): Promise<void> {
  const session = sessions.get(runId);
  if (!session) {
    throw new Error("No live paused browser session for this run");
  }
  await session.cancel();
}

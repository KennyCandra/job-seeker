export type TaskType =
  | "discover-companies"
  | "discover-fetch-filter"
  | "sync-all-jobs"
  | "sync-company"
  | "normal-filter-batch"
  | "normal-filter-job"
  | "smart-filter-accepted"
  | "smart-filter-job"
  | "refetch-job"
  | "create-application"
  | "run-apply"
  | "detect-migration"
  | "ln-companies"
  | "ln-fetch-filter"
  | "daily-pipeline";

// Task types with a handler registered in TaskRegistry (worker process only —
// see jobs.tasks.ts, filter.tasks.ts, discovery.tasks.ts, applications.service.ts).
// "run-apply" is deliberately excluded: it runs on the separate APPLY_QUEUE via
// ApplyProcessor, not through TaskRegistry/TASK_QUEUE, so it must never be
// accepted by POST /api/tasks (use POST /jobs/:jobId/apply/run instead).
// The API process never populates TaskRegistry itself (it doesn't import the
// *WorkerModule providers that call registry.register()), so this list is the
// source of truth there — keep it in sync with the register() calls above.
export const REGISTERED_TASK_TYPES: readonly TaskType[] = [
  "discover-companies",
  "discover-fetch-filter",
  "ln-companies",
  "ln-fetch-filter",
  "sync-all-jobs",
  "sync-company",
  "refetch-job",
  "detect-migration",
  "normal-filter-batch",
  "normal-filter-job",
  "smart-filter-accepted",
  "smart-filter-job",
  "create-application",
  "daily-pipeline",
];

export type TaskStatus = "queued" | "running" | "completed" | "failed" | "cancelled";

export interface EnqueueOptions {
  force?: boolean;
  dedupeKey?: string;
  jobId?: string;
  attempts?: number;
  backoff?: { type: "exponential" | "fixed"; delay: number };
  removeOnComplete?: { age: number } | boolean;
  removeOnFail?: { age: number } | boolean;
}

export interface TaskPayload {
  type: TaskType;
  payload: Record<string, unknown>;
  force?: boolean;
}

export interface TaskRunRecord {
  id: string;
  bullJobId: string | null;
  type: TaskType;
  status: TaskStatus;
  dedupeKey: string | null;
  payloadJson: string;
  progressJson: string | null;
  resultJson: string | null;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  updatedAt: string;
}

export interface TaskRunLogRecord {
  id: string;
  runId: string;
  level: string;
  message: string;
  payloadJson: string | null;
  createdAt: string;
}

export interface TaskHandlerContext {
  runId: string;
  payload: Record<string, unknown>;
  log: (level: string, message: string, meta?: Record<string, unknown>) => Promise<void>;
  progress: (value: Record<string, unknown>) => Promise<void>;
  isCancelled: () => Promise<boolean>;
  throwIfCancelled: () => Promise<void>;
}

export type HandlerFn = (ctx: TaskHandlerContext, payload: Record<string, unknown>) => Promise<unknown>;

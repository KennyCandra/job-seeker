import type {
  JobRecord,
  TailoredResumeContent,
  FilterResult,
  FilteredJob,
} from "../shared/types";

export type SkillResult =
  | { type: "text"; text: string }
  | { type: "file"; path: string; filename: string }
  | { type: "json"; data: unknown }
  | { type: "error"; message: string }
  | { type: "done" };

export type SkillArg = {
  type: string;
  description: string;
  enum?: string[];
};

export type AgentSkill = {
  name: string;
  description: string;
  params: Record<string, SkillArg>;
  required?: string[];
  execute: (
    args: Record<string, unknown>,
    session: SessionState,
    text?: string,
  ) => Promise<SkillResult>;
  chat?: true;
};

export type SessionState = {
  current_job?: JobRecord;
  current_resume?: TailoredResumeContent;
  recent_jobs: Array<{ job: JobRecord; filter: FilterResult }>;
  last_search_results?: FilteredJob[];
};

import type { AgentSkill } from "../types";
import { searchJobs } from "./searchJobs";
import { generateCv } from "./generateCv";
import { generateDocument } from "./generateDocument";
import { extractJob } from "./extractJob";
import { filterJob } from "./filterJob";
import { chat } from "./chat";
import { help as helpSkill } from "./help";

export const skills: Record<string, AgentSkill> = {
  search_jobs: searchJobs,
  generate_cv: generateCv,
  generate_document: generateDocument,
  extract_job: extractJob,
  filter_job: filterJob,
  chat,
  help: helpSkill,
};

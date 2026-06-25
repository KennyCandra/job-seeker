import { getDb, createDatabase, createConnection, resetDb, db } from "./connection";
import { ApplicationsRepository } from "./repositories/applications";
import { CompaniesRepository } from "./repositories/companies";
import { ShortlistRepository } from "./repositories/shortlist";
import { SearchConfigRepository } from "./repositories/searchConfig";
import { JobsRepository } from "./repositories/jobs";
import { JobDocumentsRepository } from "./repositories/jobDocuments";
import { JobFiltersRepository } from "./repositories/jobFilters";
import { ApplicationRunsRepository } from "./repositories/applicationRuns";
import { ApplicationRunStepsRepository } from "./repositories/applicationRunSteps";
import { TaskRunsRepository } from "./repositories/taskRuns";
import { TaskRunLogsRepository } from "./repositories/taskRunLogs";
import { UserProfileRepository } from "./repositories/userProfile";
import { UserAnswersRepository } from "./repositories/userAnswers";

function lazyInit<T>(ref: { v: T | null }, factory: () => T): T {
  if (!ref.v) ref.v = factory();
  return ref.v;
}

const applicationsRef: { v: ApplicationsRepository | null } = { v: null };
const companiesRef: { v: CompaniesRepository | null } = { v: null };
const shortlistRef: { v: ShortlistRepository | null } = { v: null };
const searchConfigRef: { v: SearchConfigRepository | null } = { v: null };
const jobsRef: { v: JobsRepository | null } = { v: null };
const jobDocumentsRef: { v: JobDocumentsRepository | null } = { v: null };
const jobFiltersRef: { v: JobFiltersRepository | null } = { v: null };
const applicationRunsRef: { v: ApplicationRunsRepository | null } = { v: null };
const applicationRunStepsRef: { v: ApplicationRunStepsRepository | null } = { v: null };
const taskRunsRef: { v: TaskRunsRepository | null } = { v: null };
const taskRunLogsRef: { v: TaskRunLogsRepository | null } = { v: null };
const userProfileRef: { v: UserProfileRepository | null } = { v: null };
const userAnswersRef: { v: UserAnswersRepository | null } = { v: null };

export const applications = {
  get instance(): ApplicationsRepository {
    return lazyInit(applicationsRef, () => new ApplicationsRepository(getDb()));
  },
};

export const companies = {
  get instance(): CompaniesRepository {
    return lazyInit(companiesRef, () => new CompaniesRepository(getDb()));
  },
};

export const shortlist = {
  get instance(): ShortlistRepository {
    return lazyInit(shortlistRef, () => new ShortlistRepository(getDb()));
  },
};

export const searchConfig = {
  get instance(): SearchConfigRepository {
    return lazyInit(searchConfigRef, () => new SearchConfigRepository(getDb()));
  },
};

export const jobs = {
  get instance(): JobsRepository {
    return lazyInit(jobsRef, () => new JobsRepository(getDb()));
  },
};

export const savedJobs = jobs;

export const jobDocuments = {
  get instance(): JobDocumentsRepository {
    return lazyInit(jobDocumentsRef, () => new JobDocumentsRepository(getDb()));
  },
};

export const jobFilters = {
  get instance(): JobFiltersRepository {
    return lazyInit(jobFiltersRef, () => new JobFiltersRepository(getDb()));
  },
};

export const applicationRuns = {
  get instance(): ApplicationRunsRepository {
    return lazyInit(applicationRunsRef, () => new ApplicationRunsRepository(getDb()));
  },
};

export const applicationRunSteps = {
  get instance(): ApplicationRunStepsRepository {
    return lazyInit(applicationRunStepsRef, () => new ApplicationRunStepsRepository(getDb()));
  },
};

export const taskRuns = {
  get instance(): TaskRunsRepository {
    return lazyInit(taskRunsRef, () => new TaskRunsRepository(getDb()));
  },
};

export const taskRunLogs = {
  get instance(): TaskRunLogsRepository {
    return lazyInit(taskRunLogsRef, () => new TaskRunLogsRepository(getDb()));
  },
};

export const userProfile = {
  get instance(): UserProfileRepository {
    return lazyInit(userProfileRef, () => new UserProfileRepository(getDb()));
  },
};

export const userAnswers = {
  get instance(): UserAnswersRepository {
    return lazyInit(userAnswersRef, () => new UserAnswersRepository(getDb()));
  },
};

export class Database {
  public applications: ApplicationsRepository;
  public companies: CompaniesRepository;
  public shortlist: ShortlistRepository;
  public searchConfig: SearchConfigRepository;
  public jobs: JobsRepository;
  public savedJobs: JobsRepository;
  public jobDocuments: JobDocumentsRepository;
  public jobFilters: JobFiltersRepository;
  public applicationRuns: ApplicationRunsRepository;
  public applicationRunSteps: ApplicationRunStepsRepository;
  public taskRuns: TaskRunsRepository;
  public taskRunLogs: TaskRunLogsRepository;
  public userProfile: UserProfileRepository;
  public userAnswers: UserAnswersRepository;

  constructor(opts: { url?: string } = {}) {
    const conn = createConnection(opts);
    this.applications = new ApplicationsRepository(conn);
    this.companies = new CompaniesRepository(conn);
    this.shortlist = new ShortlistRepository(conn);
    this.searchConfig = new SearchConfigRepository(conn);
    this.jobs = new JobsRepository(conn);
    this.savedJobs = this.jobs;
    this.jobDocuments = new JobDocumentsRepository(conn);
    this.jobFilters = new JobFiltersRepository(conn);
    this.applicationRuns = new ApplicationRunsRepository(conn);
    this.applicationRunSteps = new ApplicationRunStepsRepository(conn);
    this.taskRuns = new TaskRunsRepository(conn);
    this.taskRunLogs = new TaskRunLogsRepository(conn);
    this.userProfile = new UserProfileRepository(conn);
    this.userAnswers = new UserAnswersRepository(conn);
  }

  static open(opts: { url?: string } = {}): Database {
    return new Database(opts);
  }

  async close(): Promise<void> {
    await resetDb();
  }
}

export { getDb, createDatabase, createConnection, resetDb, db };
export { migrate } from "./migrate";
export { Repository } from "./repository";

export { ApplicationsRepository } from "./repositories/applications";
export { CompaniesRepository } from "./repositories/companies";
export { ShortlistRepository } from "./repositories/shortlist";
export { SearchConfigRepository } from "./repositories/searchConfig";
export { JobsRepository } from "./repositories/jobs";
export { ApplicationRunsRepository } from "./repositories/applicationRuns";
export { ApplicationRunStepsRepository } from "./repositories/applicationRunSteps";
export { TaskRunsRepository } from "./repositories/taskRuns";
export { TaskRunLogsRepository } from "./repositories/taskRunLogs";
export { UserProfileRepository } from "./repositories/userProfile";
export { UserAnswersRepository } from "./repositories/userAnswers";

export type { ApplicationRow, SaveAcceptedJobInput } from "./repositories/applications";
export type { CreateCompanyInput } from "./repositories/companies";
export type { SaveJobInput } from "./repositories/jobs";
export type { SaveJobDocumentInput } from "./repositories/jobDocuments";

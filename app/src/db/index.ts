import { getDb, createDatabase, createConnection, resetDb, db } from "./connection";
import { migrate } from "./migrate";
import { ApplicationsRepository } from "./repositories/applications";
import { CompaniesRepository } from "./repositories/companies";
import { ShortlistRepository } from "./repositories/shortlist";
import { SearchConfigRepository } from "./repositories/searchConfig";
import { SavedJobsRepository } from "./repositories/savedJobs";
import type { DrizzleDb } from "./connection";

let _applications: ApplicationsRepository | null = null;
let _companies: CompaniesRepository | null = null;
let _shortlist: ShortlistRepository | null = null;
let _searchConfig: SearchConfigRepository | null = null;
let _savedJobs: SavedJobsRepository | null = null;

let _rawDb: import("bun:sqlite").Database | null = null;

function lazyInit<T>(ref: { v: T | null }, factory: () => T): T {
  if (!ref.v) ref.v = factory();
  return ref.v;
}

function initRawDb(): void {
  if (!_rawDb) {
    const drizzle = getDb();
    _rawDb = (drizzle as any).session?.session?.db as import("bun:sqlite").Database;
  }
}

const applicationsRef: { v: ApplicationsRepository | null } = { v: null };
const companiesRef: { v: CompaniesRepository | null } = { v: null };
const shortlistRef: { v: ShortlistRepository | null } = { v: null };
const searchConfigRef: { v: SearchConfigRepository | null } = { v: null };
const savedJobsRef: { v: SavedJobsRepository | null } = { v: null };

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

export const savedJobs = {
  get instance(): SavedJobsRepository {
    return lazyInit(savedJobsRef, () => new SavedJobsRepository(getDb()));
  },
};

export class Database {
  public applications: ApplicationsRepository;
  public companies: CompaniesRepository;
  public shortlist: ShortlistRepository;
  public searchConfig: SearchConfigRepository;
  public savedJobs: SavedJobsRepository;
  public raw: import("bun:sqlite").Database;

  constructor(opts: { path?: string; enableWal?: boolean; autoMigrate?: boolean } = {}) {
    const conn = createConnection(opts);
    if (opts.autoMigrate !== false) migrate(conn);
    this.raw = (conn as any).session?.session?.db as import("bun:sqlite").Database;
    this.applications = new ApplicationsRepository(conn);
    this.companies = new CompaniesRepository(conn);
    this.shortlist = new ShortlistRepository(conn);
    this.searchConfig = new SearchConfigRepository(conn);
    this.savedJobs = new SavedJobsRepository(conn);
  }

  static open(opts: { path?: string; enableWal?: boolean } = {}): Database {
    return new Database(opts);
  }

  close(): void {
    try { this.raw.close(); } catch {}
  }
}

export { getDb, createDatabase, createConnection, resetDb, db };
export { migrate } from "./migrate";
export { Repository } from "./repository";

export { ApplicationsRepository } from "./repositories/applications";
export { CompaniesRepository } from "./repositories/companies";
export { ShortlistRepository } from "./repositories/shortlist";
export { SearchConfigRepository } from "./repositories/searchConfig";
export { SavedJobsRepository } from "./repositories/savedJobs";

export type { ApplicationRow, SaveAcceptedJobInput } from "./repositories/applications";
export type { CreateCompanyInput } from "./repositories/companies";
export type { SaveJobInput } from "./repositories/savedJobs";

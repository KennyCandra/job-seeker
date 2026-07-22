// Convention: repositories must alias snake_case columns to camelCase in their
// SELECTs (e.g. `created_at AS "createdAt"`) so returned rows match their record
// types; never `SELECT *`. Guard: `grep -rn "SELECT \*" src/ && echo FAIL || echo OK`.
export { CompaniesRepository } from "./companies.repository";
export { JobsRepository } from "./jobs.repository";
export { JobFiltersRepository } from "./job-filters.repository";
export { JobDocumentsRepository } from "./job-documents.repository";
export { TaskRunsRepository } from "./task-runs.repository";
export { TaskRunLogsRepository } from "./task-run-logs.repository";
export { ApplicationsRepository } from "./applications.repository";
export { ApplicationRunsRepository } from "./application-runs.repository";
export { ApplicationRunStepsRepository } from "./application-run-steps.repository";
export { UserProfileRepository } from "./user-profile.repository";
export { UserAnswersRepository } from "./user-answers.repository";
export { SearchConfigRepository } from "./search-config.repository";
export { ShortlistRepository } from "./shortlist.repository";
export { CompanySnapshotsRepository } from "./company-snapshots.repository";
// RepositoriesModule must be exported LAST: it imports the repository classes
// above from this barrel, so any repo export placed after it hits a temporal
// dead zone during module init.
export { RepositoriesModule } from "./repositories.module";

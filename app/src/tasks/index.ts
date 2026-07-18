import { registerHandler } from "./handler";
import { handleFailedQueue } from "./handlers/failedQueue/handleFailedQueue";
import { syncAllCompanies } from "./handlers/fetchQueue/syncAllCompanies";
import { syncCompany } from "./handlers/fetchQueue/syncCompany";
import { createApplicationHandler } from "./handlers/main/createApplication";
import { discoverCompaniesHandler } from "./handlers/main/discoverCompanies";
import { discoverFetchFilterHandler } from "./handlers/main/discoverFetchFilter";
import { normalFilterBatchHandler } from "./handlers/main/normalFilterBatch";
import { normalFilterJobHandler } from "./handlers/main/normalFilterJob";
import { refetchJobHandler } from "./handlers/main/refetchJob";
import { runApplyHandler } from "./handlers/main/runApply";
import { smartFilterAcceptedHandler } from "./handlers/main/smartFilterAccepted";
import { smartFilterJobHandler } from "./handlers/main/smartFilterJob";
import { syncAllJobsHandler } from "./handlers/main/syncAllJobs";
import { syncCompanyHandler } from "./handlers/main/syncCompany";
import { detectMigrationHandler } from "./handlers/migration";

export function registerAllHandlers(): void {
  registerHandler("detect-migration", detectMigrationHandler);
  registerHandler("discover-companies", discoverCompaniesHandler);
  registerHandler("discover-fetch-filter", discoverFetchFilterHandler);
  registerHandler("sync-all-jobs", syncAllJobsHandler);
  registerHandler("sync-company", syncCompanyHandler);
  registerHandler("normal-filter-batch", normalFilterBatchHandler);
  registerHandler("normal-filter-job", normalFilterJobHandler);
  registerHandler("smart-filter-accepted", smartFilterAcceptedHandler);
  registerHandler("smart-filter-job", smartFilterJobHandler);
  registerHandler("refetch-job", refetchJobHandler);
  registerHandler("create-application", createApplicationHandler);
  registerHandler("run-apply", runApplyHandler);
  registerHandler("syncAllCompanies" , syncAllCompanies)
  registerHandler("syncOneCompany" , syncCompany)
  registerHandler("handleFailedQueue" , handleFailedQueue)
}


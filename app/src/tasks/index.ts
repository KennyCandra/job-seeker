import { registerHandler } from "./handler";
import { createApplicationHandler } from "./handlers/createApplication";
import { discoverCompaniesHandler } from "./handlers/discoverCompanies";
import { discoverFetchFilterHandler } from "./handlers/discoverFetchFilter";
import { normalFilterBatchHandler } from "./handlers/normalFilterBatch";
import { normalFilterJobHandler } from "./handlers/normalFilterJob";
import { refetchJobHandler } from "./handlers/refetchJob";
import { runApplyHandler } from "./handlers/runApply";
import { smartFilterAcceptedHandler } from "./handlers/smartFilterAccepted";
import { smartFilterJobHandler } from "./handlers/smartFilterJob";
import { syncAllJobsHandler } from "./handlers/syncAllJobs";
import { syncCompanyHandler } from "./handlers/syncCompany";

export function registerAllHandlers(): void {
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
}

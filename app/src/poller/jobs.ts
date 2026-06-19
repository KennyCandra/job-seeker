import { companies } from "../db";
import { syncCompany } from "../jobs/index";

export async function poll() {
  try {
    const allCompanies = await companies.instance.getActive();
    console.log(`[poller] Syncing ${allCompanies.length} active companies...`);

    let totalFetched = 0;
    let totalNew = 0;
    let totalChanged = 0;
    let totalFailed = 0;

    for (const company of allCompanies) {
      try {
        const result = await syncCompany(company.slug, company);
        totalFetched += result.companyResult.fetched;
        totalNew += result.newJobs.length;
        totalChanged += result.changedJobs.length;
        console.log(`[poller] ${company.name}: ${result.companyResult.fetched} jobs`);
      } catch (err: any) {
        totalFailed++;
        console.warn(`[poller] Failed ${company.name}: ${err.message}`);
      }

      if (allCompanies.length > 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000));
      }
    }

    const totalCandidates = totalNew + totalChanged;
    if (totalCandidates > 0) {
      console.log(`[poller] ${totalCandidates} new/changed jobs found across ${allCompanies.length} companies (${totalFailed} failed)`);
    } else {
      console.log(`[poller] No new jobs found across ${allCompanies.length} companies`);
    }
  } catch (err) {
    console.error("[poller] Error:", err);
  }
}
